import { NextResponse } from "next/server";
import { eq, and, sql } from "drizzle-orm";
import { db } from "@/db";
import { bibleBooks, bibleChapters, bibleChapterContents } from "@/db/schema/bible";

/**
 * GET /api/bible/chapters?book=John&chapter=3
 * Returns the max verse number for a given book + chapter.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const bookName = searchParams.get("book");
  const chapterNum = searchParams.get("chapter");

  if (!bookName || !chapterNum) {
    return NextResponse.json(
      { error: "book and chapter are required" },
      { status: 400 }
    );
  }

  // Find the book by name (case-insensitive)
  const [book] = await db
    .select({ id: bibleBooks.id, totalChapters: bibleBooks.totalChapters })
    .from(bibleBooks)
    .where(sql`lower(${bibleBooks.name}) = ${bookName.toLowerCase()}`)
    .limit(1);

  if (!book) {
    return NextResponse.json({ error: "Book not found" }, { status: 404 });
  }

  // Find the chapter
  const [chapter] = await db
    .select({ id: bibleChapters.id })
    .from(bibleChapters)
    .where(
      and(
        eq(bibleChapters.bookId, book.id),
        eq(bibleChapters.number, parseInt(chapterNum, 10))
      )
    )
    .limit(1);

  if (!chapter) {
    return NextResponse.json({ error: "Chapter not found" }, { status: 404 });
  }

  // Get max verse number
  const [result] = await db
    .select({ maxVerse: sql<number>`max(${bibleChapterContents.verseNumber})` })
    .from(bibleChapterContents)
    .where(
      and(
        eq(bibleChapterContents.chapterId, chapter.id),
        eq(bibleChapterContents.type, "verse")
      )
    );

  return NextResponse.json({
    totalChapters: book.totalChapters,
    maxVerse: result?.maxVerse ?? 0,
  });
}
