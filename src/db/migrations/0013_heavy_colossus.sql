ALTER TYPE "public"."document_type" ADD VALUE 'sermon';--> statement-breakpoint
CREATE TABLE "sermon_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"document_id" uuid NOT NULL,
	"church_id" uuid NOT NULL,
	"created_by_user_id" uuid,
	"messages" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"tokens_in_total" integer DEFAULT 0 NOT NULL,
	"tokens_out_total" integer DEFAULT 0 NOT NULL,
	"cents_spent" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "sermon_sessions_document_id_unique" UNIQUE("document_id")
);
--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "sermon_budget_cents" integer DEFAULT 1000 NOT NULL;--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "sermon_metadata" jsonb;--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "published_from_sermon_at" timestamp;--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "members_searchable" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "usage_records" ADD COLUMN "sermon_tokens_cents" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "sermon_sessions" ADD CONSTRAINT "sermon_sessions_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sermon_sessions" ADD CONSTRAINT "sermon_sessions_church_id_churches_id_fk" FOREIGN KEY ("church_id") REFERENCES "public"."churches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sermon_sessions" ADD CONSTRAINT "sermon_sessions_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "sermon_sessions_church_id_idx" ON "sermon_sessions" USING btree ("church_id");