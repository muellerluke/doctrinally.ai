CREATE TABLE "embed_widget_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"church_id" uuid NOT NULL,
	"chat_id" uuid NOT NULL,
	"session_token_hash" text NOT NULL,
	"origin" text NOT NULL,
	"user_agent_hash" text,
	"visitor_fingerprint_hash" text,
	"has_interacted" boolean DEFAULT false NOT NULL,
	"outreach_sent_at" timestamp,
	"prospect_id" uuid,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"last_seen_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp NOT NULL,
	CONSTRAINT "embed_widget_sessions_session_token_hash_unique" UNIQUE("session_token_hash")
);
--> statement-breakpoint
CREATE TABLE "embed_rate_counters" (
	"session_id" uuid NOT NULL,
	"hour_bucket" timestamp NOT NULL,
	"count" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "embed_rate_counters_session_id_hour_bucket_pk" PRIMARY KEY("session_id","hour_bucket")
);
--> statement-breakpoint
CREATE TABLE "prospects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"church_id" uuid NOT NULL,
	"chat_id" uuid,
	"session_id" uuid,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"source_type" text NOT NULL,
	"source_ref" text,
	"source_url" text,
	"status" text DEFAULT 'new' NOT NULL,
	"notes" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "prospects_church_email_unique" UNIQUE("church_id","email")
);
--> statement-breakpoint
ALTER TABLE "churches" ADD COLUMN "embed_proactive_outreach_enabled" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "churches" ADD COLUMN "embed_ai_opener_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "churches" ADD COLUMN "embed_opener_templates" jsonb DEFAULT '["I noticed you're reading about {topic}. Happy to answer any questions — what's on your mind?","Welcome! Anything I can help clarify about {topic}?","Looking into {topic}? I can pull answers from our sermons and teaching — just ask.","Hi there — quick question about {topic}, or something else on your mind?","Glad you stopped by. Want me to dig into {topic} with you?"]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "embed_widget_sessions" ADD CONSTRAINT "embed_widget_sessions_church_id_churches_id_fk" FOREIGN KEY ("church_id") REFERENCES "public"."churches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "embed_widget_sessions" ADD CONSTRAINT "embed_widget_sessions_chat_id_chats_id_fk" FOREIGN KEY ("chat_id") REFERENCES "public"."chats"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prospects" ADD CONSTRAINT "prospects_church_id_churches_id_fk" FOREIGN KEY ("church_id") REFERENCES "public"."churches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prospects" ADD CONSTRAINT "prospects_chat_id_chats_id_fk" FOREIGN KEY ("chat_id") REFERENCES "public"."chats"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "embed_sessions_church_id_idx" ON "embed_widget_sessions" USING btree ("church_id");--> statement-breakpoint
CREATE INDEX "embed_sessions_expires_at_idx" ON "embed_widget_sessions" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "prospects_church_id_idx" ON "prospects" USING btree ("church_id");--> statement-breakpoint
CREATE INDEX "prospects_status_idx" ON "prospects" USING btree ("status");