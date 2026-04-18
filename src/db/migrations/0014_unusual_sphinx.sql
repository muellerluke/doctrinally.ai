CREATE TABLE "demo_bookings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"slot_start" timestamp NOT NULL,
	"agreed_to_terms_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "demo_bookings_slot_start_unique" UNIQUE("slot_start")
);
