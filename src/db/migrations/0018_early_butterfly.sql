CREATE TYPE "public"."crawl_status" AS ENUM('idle', 'queued', 'running', 'succeeded', 'failed');--> statement-breakpoint
ALTER TYPE "public"."document_type" ADD VALUE 'website_page';--> statement-breakpoint
CREATE TABLE "church_website_configs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"church_id" uuid NOT NULL,
	"additional_domains" text[] DEFAULT '{}'::text[] NOT NULL,
	"include_patterns" text[] DEFAULT '{}'::text[] NOT NULL,
	"exclude_patterns" text[] DEFAULT '{}'::text[] NOT NULL,
	"last_crawl_at" timestamp,
	"last_crawl_status" "crawl_status" DEFAULT 'idle' NOT NULL,
	"last_crawl_pages_ingested" integer DEFAULT 0 NOT NULL,
	"last_crawl_error" text,
	"last_crawl_run_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "church_website_configs_church_id_unique" UNIQUE("church_id")
);
--> statement-breakpoint
ALTER TABLE "churches" ADD COLUMN "website_domain" text;--> statement-breakpoint
ALTER TABLE "church_website_configs" ADD CONSTRAINT "church_website_configs_church_id_churches_id_fk" FOREIGN KEY ("church_id") REFERENCES "public"."churches"("id") ON DELETE cascade ON UPDATE no action;