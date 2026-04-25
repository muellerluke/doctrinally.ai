CREATE TABLE "church_feature_flags" (
	"church_id" uuid NOT NULL,
	"flag_key" text NOT NULL,
	"enabled" boolean NOT NULL,
	"updated_by_user_id" uuid,
	"note" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "church_feature_flags_church_id_flag_key_pk" PRIMARY KEY("church_id","flag_key")
);
--> statement-breakpoint
ALTER TABLE "church_feature_flags" ADD CONSTRAINT "church_feature_flags_church_id_churches_id_fk" FOREIGN KEY ("church_id") REFERENCES "public"."churches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "church_feature_flags" ADD CONSTRAINT "church_feature_flags_updated_by_user_id_users_id_fk" FOREIGN KEY ("updated_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "church_feature_flags_flag_key_idx" ON "church_feature_flags" USING btree ("flag_key");