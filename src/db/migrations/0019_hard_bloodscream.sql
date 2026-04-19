CREATE TYPE "public"."youtube_sync_status" AS ENUM('pending', 'syncing', 'active', 'paused', 'failed');--> statement-breakpoint
CREATE TABLE "youtube_channel_syncs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"church_id" uuid NOT NULL,
	"channel_url" text NOT NULL,
	"channel_id" text,
	"channel_handle" text,
	"channel_title" text,
	"channel_thumbnail" text,
	"status" "youtube_sync_status" DEFAULT 'pending' NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"day_of_week" integer DEFAULT 1 NOT NULL,
	"hour_local" integer DEFAULT 3 NOT NULL,
	"timezone" text DEFAULT 'UTC' NOT NULL,
	"trigger_schedule_id" text,
	"last_sync_started_at" timestamp,
	"last_sync_ended_at" timestamp,
	"last_sync_error" text,
	"last_sync_stats" jsonb,
	"root_folder_id" uuid,
	"videos_folder_id" uuid,
	"shorts_folder_id" uuid,
	"live_folder_id" uuid,
	"playlists_root_folder_id" uuid,
	"created_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "youtube_channel_syncs_church_id_unique" UNIQUE("church_id")
);
--> statement-breakpoint
CREATE TABLE "youtube_sync_playlists" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sync_id" uuid NOT NULL,
	"playlist_id" text NOT NULL,
	"playlist_title" text,
	"folder_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "youtube_sync_playlists_sync_id_playlist_id_unique" UNIQUE("sync_id","playlist_id")
);
--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "youtube_video_id" text;--> statement-breakpoint
-- Backfill youtube_video_id from existing source_url values on YouTube docs
-- so the partial unique index below can be created without collisions and
-- future auto-sync dedup works against historical manual uploads.
UPDATE "documents"
SET "youtube_video_id" = substring(
  "source_url" FROM '(?:youtube\.com/watch\?v=|youtu\.be/|youtube\.com/embed/|youtube\.com/shorts/|youtube\.com/live/)([a-zA-Z0-9_-]{11})'
)
WHERE "type" = 'youtube'
  AND "source_url" IS NOT NULL
  AND "youtube_video_id" IS NULL;--> statement-breakpoint
ALTER TABLE "youtube_channel_syncs" ADD CONSTRAINT "youtube_channel_syncs_church_id_churches_id_fk" FOREIGN KEY ("church_id") REFERENCES "public"."churches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "youtube_channel_syncs" ADD CONSTRAINT "youtube_channel_syncs_root_folder_id_folders_id_fk" FOREIGN KEY ("root_folder_id") REFERENCES "public"."folders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "youtube_channel_syncs" ADD CONSTRAINT "youtube_channel_syncs_videos_folder_id_folders_id_fk" FOREIGN KEY ("videos_folder_id") REFERENCES "public"."folders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "youtube_channel_syncs" ADD CONSTRAINT "youtube_channel_syncs_shorts_folder_id_folders_id_fk" FOREIGN KEY ("shorts_folder_id") REFERENCES "public"."folders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "youtube_channel_syncs" ADD CONSTRAINT "youtube_channel_syncs_live_folder_id_folders_id_fk" FOREIGN KEY ("live_folder_id") REFERENCES "public"."folders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "youtube_channel_syncs" ADD CONSTRAINT "youtube_channel_syncs_playlists_root_folder_id_folders_id_fk" FOREIGN KEY ("playlists_root_folder_id") REFERENCES "public"."folders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "youtube_channel_syncs" ADD CONSTRAINT "youtube_channel_syncs_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "youtube_sync_playlists" ADD CONSTRAINT "youtube_sync_playlists_sync_id_youtube_channel_syncs_id_fk" FOREIGN KEY ("sync_id") REFERENCES "public"."youtube_channel_syncs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "youtube_sync_playlists" ADD CONSTRAINT "youtube_sync_playlists_folder_id_folders_id_fk" FOREIGN KEY ("folder_id") REFERENCES "public"."folders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "documents_church_youtube_video_idx" ON "documents" USING btree ("church_id","youtube_video_id") WHERE "documents"."youtube_video_id" IS NOT NULL;