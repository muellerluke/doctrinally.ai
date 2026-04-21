ALTER TABLE "churches" ADD COLUMN "embed_public_key" text;--> statement-breakpoint
ALTER TABLE "churches" ADD COLUMN "embed_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "churches" ADD CONSTRAINT "churches_embed_public_key_unique" UNIQUE("embed_public_key");