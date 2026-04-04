ALTER TABLE "chats" DROP CONSTRAINT "chats_topic_id_topics_id_fk";
--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "topic_id" uuid;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_topic_id_topics_id_fk" FOREIGN KEY ("topic_id") REFERENCES "public"."topics"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chats" DROP COLUMN "topic_id";--> statement-breakpoint
ALTER TABLE "topics" DROP COLUMN "chat_count";