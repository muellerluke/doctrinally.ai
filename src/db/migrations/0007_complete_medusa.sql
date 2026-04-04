ALTER TABLE "chats" ADD COLUMN "is_admin_test" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "has_citations" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "usage_records" ADD COLUMN "visitors" integer DEFAULT 0 NOT NULL;