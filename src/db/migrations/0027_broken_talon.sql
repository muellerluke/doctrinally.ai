CREATE TABLE "embed_session_ips" (
	"session_id" uuid NOT NULL,
	"ip_hash" text NOT NULL,
	"first_seen_at" timestamp DEFAULT now() NOT NULL,
	"last_seen_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "embed_session_ips_session_id_ip_hash_pk" PRIMARY KEY("session_id","ip_hash")
);
--> statement-breakpoint
CREATE TABLE "embed_church_chat_counters" (
	"church_id" uuid NOT NULL,
	"hour_bucket" timestamp NOT NULL,
	"count" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "embed_church_chat_counters_church_id_hour_bucket_pk" PRIMARY KEY("church_id","hour_bucket")
);
--> statement-breakpoint
ALTER TABLE "embed_session_ips" ADD CONSTRAINT "embed_session_ips_session_id_embed_widget_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."embed_widget_sessions"("id") ON DELETE cascade ON UPDATE no action;