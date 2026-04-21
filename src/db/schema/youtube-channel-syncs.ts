import {
  boolean,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { churches } from "./churches";
import { users } from "./users";
import { folders } from "./folders";

export const youtubeSyncStatusEnum = pgEnum("youtube_sync_status", [
  "pending",
  "syncing",
  "active",
  "paused",
  "failed",
]);

export const youtubeChannelSyncs = pgTable("youtube_channel_syncs", {
  id: uuid("id").defaultRandom().primaryKey(),
  churchId: uuid("church_id")
    .notNull()
    .unique()
    .references(() => churches.id, { onDelete: "cascade" }),

  channelUrl: text("channel_url").notNull(),
  channelId: text("channel_id"),
  channelHandle: text("channel_handle"),
  channelTitle: text("channel_title"),
  channelThumbnail: text("channel_thumbnail"),

  status: youtubeSyncStatusEnum("status").notNull().default("pending"),
  enabled: boolean("enabled").notNull().default(true),

  // 0 = Sunday, matches cron DOW convention used by Trigger.dev.
  dayOfWeek: integer("day_of_week").notNull().default(1),
  hourLocal: integer("hour_local").notNull().default(3),
  timezone: text("timezone").notNull().default("UTC"),

  triggerScheduleId: text("trigger_schedule_id"),

  lastSyncStartedAt: timestamp("last_sync_started_at", { mode: "date" }),
  lastSyncEndedAt: timestamp("last_sync_ended_at", { mode: "date" }),
  lastSyncError: text("last_sync_error"),
  lastSyncStats: jsonb("last_sync_stats").$type<{
    imported?: number;
    skipped?: number;
    playlistsDiscovered?: number;
    noCaptionsSkipped?: number;
    recoveredFromSkipped?: number;
  }>(),

  // Snapshot of the most recent caption availability scan for this channel.
  // Powers the "Caption coverage" card in Settings without re-hitting YouTube
  // on every page load.
  lastCaptionScan: jsonb("last_caption_scan").$type<{
    scannedAt: string;
    total: number;
    withCaptions: number;
    withoutCaptions: number;
    missingSample: Array<{
      documentId: string;
      title: string;
      url: string;
    }>;
    notified: boolean;
  }>(),

  rootFolderId: uuid("root_folder_id").references(() => folders.id, {
    onDelete: "set null",
  }),
  videosFolderId: uuid("videos_folder_id").references(() => folders.id, {
    onDelete: "set null",
  }),
  shortsFolderId: uuid("shorts_folder_id").references(() => folders.id, {
    onDelete: "set null",
  }),
  liveFolderId: uuid("live_folder_id").references(() => folders.id, {
    onDelete: "set null",
  }),
  playlistsRootFolderId: uuid("playlists_root_folder_id").references(
    () => folders.id,
    { onDelete: "set null" }
  ),

  createdBy: uuid("created_by").references(() => users.id, {
    onDelete: "set null",
  }),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
});

export const youtubeChannelSyncsRelations = relations(
  youtubeChannelSyncs,
  ({ one }) => ({
    church: one(churches, {
      fields: [youtubeChannelSyncs.churchId],
      references: [churches.id],
    }),
  })
);
