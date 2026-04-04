import { NextResponse } from "next/server";
import { asc } from "drizzle-orm";
import { db } from "@/db";
import { bibleBooks } from "@/db/schema/bible";

export async function GET() {
  const books = await db
    .select({
      id: bibleBooks.id,
      name: bibleBooks.name,
      totalChapters: bibleBooks.totalChapters,
    })
    .from(bibleBooks)
    .orderBy(asc(bibleBooks.sortOrder));

  return NextResponse.json(books);
}
