ALTER TYPE "public"."document_status" ADD VALUE 'skipped_no_captions';--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "has_captions" boolean;--> statement-breakpoint
ALTER TABLE "youtube_channel_syncs" ADD COLUMN "last_caption_scan" jsonb;