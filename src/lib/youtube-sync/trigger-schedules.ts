import { schedules } from "@trigger.dev/sdk/v3";

export type ScheduleConfig = {
  syncId: string;
  dayOfWeek: number;
  hourLocal: number;
  timezone: string;
};

/**
 * Build a weekly cron that fires at the given local hour on the given day.
 * Minute is pinned to a stable offset derived from the syncId so schedules
 * don't all land exactly on :00 — spreads the load across the Supadata
 * rate limit when many churches pick the same slot.
 */
function buildCron(config: ScheduleConfig): string {
  const minuteOffset = hashOffset(config.syncId, 60);
  return `${minuteOffset} ${config.hourLocal} * * ${config.dayOfWeek}`;
}

function hashOffset(input: string, modulo: number): number {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 31 + input.charCodeAt(i)) >>> 0;
  }
  return hash % modulo;
}

/**
 * Upsert a Trigger.dev schedule for a church's weekly YouTube sync. Uses
 * the syncId as both `deduplicationKey` and `externalId`, so calling this
 * repeatedly updates the same schedule row on the Trigger.dev side.
 */
export async function upsertChurchSyncSchedule(
  config: ScheduleConfig
): Promise<string> {
  const cron = buildCron(config);

  const result = await schedules.create({
    task: "sync-youtube-channel",
    cron,
    timezone: config.timezone || "UTC",
    deduplicationKey: `youtube-sync-${config.syncId}`,
    externalId: config.syncId,
  });

  return result.id;
}

/**
 * Stops the schedule from firing but keeps the record, so a future
 * `upsertChurchSyncSchedule` with the same deduplicationKey re-activates it.
 */
export async function deactivateChurchSyncSchedule(
  scheduleId: string
): Promise<void> {
  await schedules.deactivate(scheduleId);
}

export async function activateChurchSyncSchedule(
  scheduleId: string
): Promise<void> {
  await schedules.activate(scheduleId);
}

export async function deleteChurchSyncSchedule(
  scheduleId: string
): Promise<void> {
  await schedules.del(scheduleId);
}
