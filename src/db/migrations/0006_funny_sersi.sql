CREATE TABLE "bible_books" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"sort_order" integer NOT NULL,
	"total_chapters" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bible_chapter_contents" (
	"id" serial PRIMARY KEY NOT NULL,
	"chapter_id" integer NOT NULL,
	"verse_number" integer,
	"type" text NOT NULL,
	"content" jsonb
);
--> statement-breakpoint
CREATE TABLE "bible_chapter_footnotes" (
	"id" serial PRIMARY KEY NOT NULL,
	"chapter_id" integer NOT NULL,
	"text" text NOT NULL,
	"reference_verse" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bible_chapters" (
	"id" serial PRIMARY KEY NOT NULL,
	"number" integer NOT NULL,
	"book_id" text NOT NULL,
	CONSTRAINT "bible_chapters_book_number" UNIQUE("book_id","number")
);
--> statement-breakpoint
ALTER TABLE "bible_chapter_contents" ADD CONSTRAINT "bible_chapter_contents_chapter_id_bible_chapters_id_fk" FOREIGN KEY ("chapter_id") REFERENCES "public"."bible_chapters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bible_chapter_footnotes" ADD CONSTRAINT "bible_chapter_footnotes_chapter_id_bible_chapters_id_fk" FOREIGN KEY ("chapter_id") REFERENCES "public"."bible_chapters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bible_chapters" ADD CONSTRAINT "bible_chapters_book_id_bible_books_id_fk" FOREIGN KEY ("book_id") REFERENCES "public"."bible_books"("id") ON DELETE cascade ON UPDATE no action;