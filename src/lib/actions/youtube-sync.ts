"use server";

import { getServerSession } from "next-auth";
import { eq } from "drizzle-orm";
import { after } from "next/server";
import { tasks } from "@trigger.dev/sdk/v3";
import { z } from "zod";
import { db } from "@/db";
import {
  subscriptions,
  youtubeChannelSyncs,
  youtubeSyncPlaylists,
} from "@/db/schema";
import { authOptions } from "@/lib/auth";
import { getActiveMembershipForUser } from "@/lib/active-church";
import { canUseYouTubeSync } from "@/lib/plan-gating";
import {
  parseChannelInput,
  parsePlaylistInput,
  resolveChannel,
} from "@/trigger/utils/youtube-channel";
import {
  deactivateChurchSyncSchedule,
  deleteChurchSyncSchedule,
  upsertChurchSyncSchedule,
} from "@/lib/youtube-sync/trigger-schedules";

async function getAuthContext() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;
  const active = await getActiveMembershipForUser(session.user.id);
  if (!active) return null;
  return {
    userId: session.user.id,
    membership: active.membership,
    church: active.church,
  };
}

async function requireEnterpriseContext() {
  const ctx = await getAuthContext();
  if (!ctx) return { error: "Unauthorized" as const };

  const sub = await db.query.subscriptions.findFirst({
    where: eq(subscriptions.churchId, ctx.membership.churchId),
  });
  if (!sub) return { error: "Subscription not found" as const };
  if (!canUseYouTubeSync(sub.plan)) {
    return { error: "YouTube auto-sync requires the Enterprise plan" as const };
  }

  return { ctx, sub };
}

export async function getYouTubeSyncConfig() {
  const ctx = await getAuthContext();
  if (!ctx) return { error: "Unauthorized" };

  const sync = await db.query.youtubeChannelSyncs.findFirst({
    where: eq(youtubeChannelSyncs.churchId, ctx.membership.churchId),
  });

  if (!sync) return { success: true, sync: null, playlists: [] };

  const playlists = await db.query.youtubeSyncPlaylists.findMany({
    where: eq(youtubeSyncPlaylists.syncId, sync.id),
  });

  return { success: true, sync, playlists };
}

const connectSchema = z.object({
  channelUrl: z.string().min(1, "Channel URL is required").max(500),
  dayOfWeek: z.number().int().min(0).max(6).default(1),
  hourLocal: z.number().int().min(0).max(23).default(3),
  timezone: z.string().min(1).default("UTC"),
});

export async function connectYouTubeChannel(input: {
  channelUrl: string;
  dayOfWeek?: number;
  hourLocal?: number;
  timezone?: string;
}) {
  const gated = await requireEnterpriseContext();
  if ("error" in gated) return { error: gated.error };
  const { ctx } = gated;

  const parsed = connectSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  // Validate the channel resolves before committing any rows. This gives
  // the user an immediate "channel not found" error instead of a broken
  // sync row in the dashboard.
  let resolved;
  try {
    parseChannelInput(parsed.data.channelUrl);
    resolved = await resolveChannel(parsed.data.channelUrl);
  } catch (err) {
    return {
      error:
        err instanceof Error
          ? `Could not find YouTube channel: ${err.message}`
          : "Could not find YouTube channel",
    };
  }

  // Upsert the sync row — one per church.
  const existing = await db.query.youtubeChannelSyncs.findFirst({
    where: eq(youtubeChannelSyncs.churchId, ctx.membership.churchId),
  });

  let syncId: string;
  if (existing) {
    await db
      .update(youtubeChannelSyncs)
      .set({
        channelUrl: parsed.data.channelUrl,
        channelId: resolved.channelId,
        channelHandle: resolved.handle ?? null,
        channelTitle: resolved.title,
        channelThumbnail: resolved.thumbnail ?? null,
        dayOfWeek: parsed.data.dayOfWeek,
        hourLocal: parsed.data.hourLocal,
        timezone: parsed.data.timezone,
        enabled: true,
        status: "pending",
        updatedAt: new Date(),
      })
      .where(eq(youtubeChannelSyncs.id, existing.id));
    syncId = existing.id;
  } else {
    const [row] = await db
      .insert(youtubeChannelSyncs)
      .values({
        churchId: ctx.membership.churchId,
        channelUrl: parsed.data.channelUrl,
        channelId: resolved.channelId,
        channelHandle: resolved.handle ?? null,
        channelTitle: resolved.title,
        channelThumbnail: resolved.thumbnail ?? null,
        dayOfWeek: parsed.data.dayOfWeek,
        hourLocal: parsed.data.hourLocal,
        timezone: parsed.data.timezone,
        createdBy: ctx.userId,
      })
      .returning({ id: youtubeChannelSyncs.id });
    syncId = row.id;
  }

  // Register the weekly schedule and kick off the initial backfill after
  // the response flushes so the settings UI returns promptly.
  after(async () => {
    try {
      const scheduleId = await upsertChurchSyncSchedule({
        syncId,
        dayOfWeek: parsed.data.dayOfWeek,
        hourLocal: parsed.data.hourLocal,
        timezone: parsed.data.timezone,
      });
      await db
        .update(youtubeChannelSyncs)
        .set({ triggerScheduleId: scheduleId, updatedAt: new Date() })
        .where(eq(youtubeChannelSyncs.id, syncId));
    } catch (err) {
      console.error(
        `[connectYouTubeChannel] schedules.create failed for sync ${syncId}:`,
        err
      );
    }

    try {
      await tasks.trigger("sync-youtube-channel", {
        syncId,
        mode: "initial",
      });
    } catch (err) {
      console.error(
        `[connectYouTubeChannel] initial trigger failed for sync ${syncId}:`,
        err
      );
    }
  });

  return {
    success: true,
    syncId,
    channel: {
      id: resolved.channelId,
      title: resolved.title,
      handle: resolved.handle,
      thumbnail: resolved.thumbnail,
    },
  };
}

const scheduleSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  hourLocal: z.number().int().min(0).max(23),
  timezone: z.string().min(1),
  enabled: z.boolean(),
});

export async function updateYouTubeSyncSchedule(input: {
  dayOfWeek: number;
  hourLocal: number;
  timezone: string;
  enabled: boolean;
}) {
  const gated = await requireEnterpriseContext();
  if ("error" in gated) return { error: gated.error };
  const { ctx } = gated;

  const parsed = scheduleSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const sync = await db.query.youtubeChannelSyncs.findFirst({
    where: eq(youtubeChannelSyncs.churchId, ctx.membership.churchId),
  });
  if (!sync) return { error: "No YouTube sync configured for this church" };

  await db
    .update(youtubeChannelSyncs)
    .set({
      dayOfWeek: parsed.data.dayOfWeek,
      hourLocal: parsed.data.hourLocal,
      timezone: parsed.data.timezone,
      enabled: parsed.data.enabled,
      status: parsed.data.enabled ? sync.status : "paused",
      updatedAt: new Date(),
    })
    .where(eq(youtubeChannelSyncs.id, sync.id));

  after(async () => {
    try {
      if (parsed.data.enabled) {
        const scheduleId = await upsertChurchSyncSchedule({
          syncId: sync.id,
          dayOfWeek: parsed.data.dayOfWeek,
          hourLocal: parsed.data.hourLocal,
          timezone: parsed.data.timezone,
        });
        if (scheduleId !== sync.triggerScheduleId) {
          await db
            .update(youtubeChannelSyncs)
            .set({ triggerScheduleId: scheduleId, updatedAt: new Date() })
            .where(eq(youtubeChannelSyncs.id, sync.id));
        }
      } else if (sync.triggerScheduleId) {
        await deactivateChurchSyncSchedule(sync.triggerScheduleId);
      }
    } catch (err) {
      console.error(
        `[updateYouTubeSyncSchedule] schedule update failed for sync ${sync.id}:`,
        err
      );
    }
  });

  return { success: true };
}

export async function triggerManualYouTubeSync() {
  const gated = await requireEnterpriseContext();
  if ("error" in gated) return { error: gated.error };
  const { ctx } = gated;

  const sync = await db.query.youtubeChannelSyncs.findFirst({
    where: eq(youtubeChannelSyncs.churchId, ctx.membership.churchId),
  });
  if (!sync) return { error: "No YouTube sync configured for this church" };
  if (sync.status === "syncing") {
    return { error: "A sync is already in progress" };
  }

  await tasks.trigger("sync-youtube-channel", {
    syncId: sync.id,
    mode: "manual",
  });

  return { success: true };
}

export async function disconnectYouTubeChannel() {
  const gated = await requireEnterpriseContext();
  if ("error" in gated) return { error: gated.error };
  const { ctx } = gated;

  const sync = await db.query.youtubeChannelSyncs.findFirst({
    where: eq(youtubeChannelSyncs.churchId, ctx.membership.churchId),
  });
  if (!sync) return { success: true };

  await db
    .delete(youtubeChannelSyncs)
    .where(eq(youtubeChannelSyncs.id, sync.id));

  if (sync.triggerScheduleId) {
    after(async () => {
      try {
        await deleteChurchSyncSchedule(sync.triggerScheduleId!);
      } catch (err) {
        console.error(
          `[disconnectYouTubeChannel] schedule delete failed for ${sync.triggerScheduleId}:`,
          err
        );
      }
    });
  }

  return { success: true };
}

const playlistSchema = z.object({
  playlistUrl: z.string().min(1).max(500),
});

export async function addPlaylistToSync(input: { playlistUrl: string }) {
  const gated = await requireEnterpriseContext();
  if ("error" in gated) return { error: gated.error };
  const { ctx } = gated;

  const parsed = playlistSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const sync = await db.query.youtubeChannelSyncs.findFirst({
    where: eq(youtubeChannelSyncs.churchId, ctx.membership.churchId),
  });
  if (!sync) return { error: "Connect a YouTube channel first" };

  let playlistId: string;
  try {
    playlistId = parsePlaylistInput(parsed.data.playlistUrl);
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Invalid playlist URL",
    };
  }

  try {
    await db.insert(youtubeSyncPlaylists).values({
      syncId: sync.id,
      playlistId,
    });
  } catch {
    return { error: "That playlist is already attached" };
  }

  return { success: true };
}

export async function removePlaylistFromSync(playlistRowId: string) {
  const gated = await requireEnterpriseContext();
  if ("error" in gated) return { error: gated.error };
  const { ctx } = gated;

  const row = await db.query.youtubeSyncPlaylists.findFirst({
    where: eq(youtubeSyncPlaylists.id, playlistRowId),
  });
  if (!row) return { error: "Playlist not found" };

  const sync = await db.query.youtubeChannelSyncs.findFirst({
    where: eq(youtubeChannelSyncs.id, row.syncId),
  });
  if (!sync || sync.churchId !== ctx.membership.churchId) {
    return { error: "Unauthorized" };
  }

  await db
    .delete(youtubeSyncPlaylists)
    .where(eq(youtubeSyncPlaylists.id, playlistRowId));

  return { success: true };
}
