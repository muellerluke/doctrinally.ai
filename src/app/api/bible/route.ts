import { NextResponse } from "next/server";
import { lookupPassage } from "@/lib/bible";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const book = searchParams.get("book");
  const chapter = searchParams.get("chapter");
  const verseStart = searchParams.get("verseStart");
  const verseEnd = searchParams.get("verseEnd");

  if (!book || !chapter) {
    return NextResponse.json(
      { error: "book and chapter are required" },
      { status: 400 }
    );
  }

  const result = await lookupPassage(
    book,
    parseInt(chapter, 10),
    verseStart ? parseInt(verseStart, 10) : undefined,
    verseEnd ? parseInt(verseEnd, 10) : undefined
  );

  if (!result) {
    return NextResponse.json(
      { error: "Passage not found" },
      { status: 404 }
    );
  }

  return NextResponse.json({
    text: result.text,
    verses: result.verses,
    reference: result.reference,
  });
}
