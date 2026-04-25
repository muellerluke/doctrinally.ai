CREATE TABLE "embed_ip_session_counters" (
	"ip_hash" text NOT NULL,
	"day_bucket" date NOT NULL,
	"count" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "embed_ip_session_counters_ip_hash_day_bucket_pk" PRIMARY KEY("ip_hash","day_bucket")
);
