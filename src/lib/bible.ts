import { db } from "@/db";
import { sql, eq, and, gte, lte, asc } from "drizzle-orm";
import {
  bibleBooks,
  bibleChapters,
  bibleChapterContents,
} from "@/db/schema/bible";

/**
 * Content element types from the JSON array stored in bible_chapter_contents.content
 */
type ContentElement =
  | string
  | { text: string; lineBreak?: boolean }
  | { lineBreak: true }
  | { noteId: number };

/**
 * Convert the JSON content array for a verse/heading into plain text.
 */
export function formatVerseContent(
  content: unknown[] | null
): string {
  if (!content) return "";

  return content
    .map((el) => {
      if (typeof el === "string") return el;
      if (typeof el === "object" && el !== null) {
        const obj = el as Record<string, unknown>;
        if ("text" in obj && typeof obj.text === "string") return obj.text;
        if ("lineBreak" in obj && obj.lineBreak === true) return "\n";
        // Skip noteId references
      }
      return "";
    })
    .join("");
}

/**
 * Parse a Bible reference string into structured parts.
 *
 * Handles formats like:
 * - "John 3:16"
 * - "Genesis 1:1-5"
 * - "1 Corinthians 13:4-7"
 * - "Psalm 23"  (whole chapter)
 * - "Romans 8:28-30"
 */
export function parseReference(reference: string): {
  book: string;
  chapter: number;
  verseStart?: number;
  verseEnd?: number;
} | null {
  const trimmed = reference.trim();

  // Match: optional number prefix + book name + chapter + optional :verseStart-verseEnd
  const match = trimmed.match(
    /^(\d?\s*[A-Za-z][A-Za-z\s]+?)\s+(\d+)(?::(\d+)(?:-(\d+))?)?$/
  );

  if (!match) return null;

  const book = match[1].trim();
  const chapter = parseInt(match[2], 10);
  const verseStart = match[3] ? parseInt(match[3], 10) : undefined;
  const verseEnd = match[4] ? parseInt(match[4], 10) : undefined;

  return { book, chapter, verseStart, verseEnd };
}

/**
 * Book name aliases that map common names to the 3-char IDs used in the database.
 */
const BOOK_ALIASES: Record<string, string> = {
  // Old Testament
  genesis: "GEN", exodus: "EXO", leviticus: "LEV", numbers: "NUM",
  deuteronomy: "DEU", joshua: "JOS", judges: "JDG", ruth: "RUT",
  "1 samuel": "1SA", "2 samuel": "2SA", "1 kings": "1KI", "2 kings": "2KI",
  "1 chronicles": "1CH", "2 chronicles": "2CH", ezra: "EZR", nehemiah: "NEH",
  esther: "EST", job: "JOB", psalm: "PSA", psalms: "PSA",
  proverbs: "PRO", ecclesiastes: "ECC", "song of solomon": "SNG",
  "song of songs": "SNG", isaiah: "ISA", jeremiah: "JER",
  lamentations: "LAM", ezekiel: "EZK", daniel: "DAN", hosea: "HOS",
  joel: "JOL", amos: "AMO", obadiah: "OBA", jonah: "JON", micah: "MIC",
  nahum: "NAM", habakkuk: "HAB", zephaniah: "ZEP", haggai: "HAG",
  zechariah: "ZEC", malachi: "MAL",
  // New Testament
  matthew: "MAT", mark: "MRK", luke: "LUK", john: "JHN",
  acts: "ACT", romans: "ROM", "1 corinthians": "1CO", "2 corinthians": "2CO",
  galatians: "GAL", ephesians: "EPH", philippians: "PHP",
  colossians: "COL", "1 thessalonians": "1TH", "2 thessalonians": "2TH",
  "1 timothy": "1TI", "2 timothy": "2TI", titus: "TIT", philemon: "PHM",
  hebrews: "HEB", james: "JAS", "1 peter": "1PE", "2 peter": "2PE",
  "1 john": "1JN", "2 john": "2JN", "3 john": "3JN", jude: "JUD",
  revelation: "REV",
};

/**
 * Resolve a book name (e.g. "John", "1 Corinthians") to its database ID.
 */
async function resolveBookId(bookName: string): Promise<string | null> {
  const normalized = bookName.toLowerCase().trim();

  // Try alias first
  if (BOOK_ALIASES[normalized]) return BOOK_ALIASES[normalized];

  // Try matching by name in the database
  const [book] = await db
    .select({ id: bibleBooks.id })
    .from(bibleBooks)
    .where(sql`lower(${bibleBooks.name}) = ${normalized}`)
    .limit(1);

  return book?.id ?? null;
}

/**
 * Look up a Bible passage and return formatted text.
 */
export async function lookupPassage(
  bookName: string,
  chapter: number,
  verseStart?: number,
  verseEnd?: number
): Promise<{
  text: string;
  verses: { verse: number; text: string }[];
  reference: string;
  bookName: string;
  chapter: number;
  verseStart?: number;
  verseEnd?: number;
} | null> {
  const bookId = await resolveBookId(bookName);
  if (!bookId) return null;

  // Get the full book name for display
  const [book] = await db
    .select({ name: bibleBooks.name })
    .from(bibleBooks)
    .where(eq(bibleBooks.id, bookId))
    .limit(1);

  if (!book) return null;

  // Find the chapter
  const [chapterRow] = await db
    .select({ id: bibleChapters.id })
    .from(bibleChapters)
    .where(
      and(
        eq(bibleChapters.bookId, bookId),
        eq(bibleChapters.number, chapter)
      )
    )
    .limit(1);

  if (!chapterRow) return null;

  // Build the query for chapter contents
  const conditions = [
    eq(bibleChapterContents.chapterId, chapterRow.id),
    eq(bibleChapterContents.type, "verse"),
  ];

  if (verseStart !== undefined) {
    conditions.push(gte(bibleChapterContents.verseNumber, verseStart));
  }
  if (verseEnd !== undefined) {
    conditions.push(lte(bibleChapterContents.verseNumber, verseEnd));
  } else if (verseStart !== undefined) {
    // Single verse
    conditions.push(lte(bibleChapterContents.verseNumber, verseStart));
  }

  const rows = await db
    .select({
      verseNumber: bibleChapterContents.verseNumber,
      content: bibleChapterContents.content,
    })
    .from(bibleChapterContents)
    .where(and(...conditions))
    .orderBy(asc(bibleChapterContents.id));

  if (rows.length === 0) return null;

  // Format verses into structured data + plain text
  const verses: { verse: number; text: string }[] = [];
  let currentVerse: number | null = null;
  let currentText = "";

  for (const row of rows) {
    if (row.verseNumber !== currentVerse && row.verseNumber !== null) {
      if (currentText && currentVerse !== null) {
        verses.push({ verse: currentVerse, text: currentText.trim() });
      }
      currentVerse = row.verseNumber;
      currentText = "";
    }

    const text = formatVerseContent(row.content as unknown[] | null);
    currentText += text;
  }

  if (currentText && currentVerse !== null) {
    verses.push({ verse: currentVerse, text: currentText.trim() });
  }

  const fullText = verses.map((v) => `${v.verse} ${v.text}`).join(" ");

  // Build reference string
  let reference = `${book.name} ${chapter}`;
  if (verseStart !== undefined) {
    reference += `:${verseStart}`;
    if (verseEnd !== undefined && verseEnd !== verseStart) {
      reference += `-${verseEnd}`;
    }
  }

  return {
    text: fullText,
    verses,
    reference,
    bookName: book.name,
    chapter,
    verseStart,
    verseEnd,
  };
}

/**
 * Convenience: parse a reference string and look up the passage.
 */
export async function lookupByReference(
  reference: string
): Promise<{
  text: string;
  reference: string;
  bookName: string;
  chapter: number;
  verseStart?: number;
  verseEnd?: number;
} | null> {
  const parsed = parseReference(reference);
  if (!parsed) return null;

  return lookupPassage(
    parsed.book,
    parsed.chapter,
    parsed.verseStart,
    parsed.verseEnd
  );
}
