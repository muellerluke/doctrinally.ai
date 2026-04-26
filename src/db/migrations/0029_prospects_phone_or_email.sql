ALTER TABLE "prospects" ALTER COLUMN "name" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "prospects" ALTER COLUMN "email" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "prospects" ADD COLUMN "phone" text;--> statement-breakpoint
ALTER TABLE "prospects" ADD CONSTRAINT "prospects_church_phone_unique" UNIQUE("church_id","phone");