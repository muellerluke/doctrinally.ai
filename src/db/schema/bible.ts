import {
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  unique,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ---- Bible Books ----

export const bibleBooks = pgTable("bible_books", {
  id: text("id").primaryKey(), // 3-char abbreviation, e.g. "GEN", "MAT"
  name: text("name").notNull(),
  sortOrder: integer("sort_order").notNull(),
  totalChapters: integer("total_chapters").notNull(),
});

export const bibleBooksRelations = relations(bibleBooks, ({ many }) => ({
  chapters: many(bibleChapters),
}));

// ---- Bible Chapters ----

export const bibleChapters = pgTable(
  "bible_chapters",
  {
    id: serial("id").primaryKey(),
    number: integer("number").notNull(),
    bookId: text("book_id")
      .notNull()
      .references(() => bibleBooks.id, { onDelete: "cascade" }),
  },
  (t) => [unique("bible_chapters_book_number").on(t.bookId, t.number)]
);

export const bibleChaptersRelations = relations(
  bibleChapters,
  ({ one, many }) => ({
    book: one(bibleBooks, {
      fields: [bibleChapters.bookId],
      references: [bibleBooks.id],
    }),
    contents: many(bibleChapterContents),
    footnotes: many(bibleChapterFootnotes),
  })
);

// ---- Bible Chapter Contents (verses & headings) ----

export const bibleChapterContents = pgTable("bible_chapter_contents", {
  id: serial("id").primaryKey(),
  chapterId: integer("chapter_id")
    .notNull()
    .references(() => bibleChapters.id, { onDelete: "cascade" }),
  verseNumber: integer("verse_number"), // null for headings
  type: text("type").notNull(), // "verse" or "heading"
  content: jsonb("content"), // JSON array of content elements
});

export const bibleChapterContentsRelations = relations(
  bibleChapterContents,
  ({ one }) => ({
    chapter: one(bibleChapters, {
      fields: [bibleChapterContents.chapterId],
      references: [bibleChapters.id],
    }),
  })
);

// ---- Bible Chapter Footnotes ----

export const bibleChapterFootnotes = pgTable("bible_chapter_footnotes", {
  id: serial("id").primaryKey(),
  chapterId: integer("chapter_id")
    .notNull()
    .references(() => bibleChapters.id, { onDelete: "cascade" }),
  text: text("text").notNull(),
  referenceVerse: integer("reference_verse").notNull(),
});

export const bibleChapterFootnotesRelations = relations(
  bibleChapterFootnotes,
  ({ one }) => ({
    chapter: one(bibleChapters, {
      fields: [bibleChapterFootnotes.chapterId],
      references: [bibleChapters.id],
    }),
  })
);
