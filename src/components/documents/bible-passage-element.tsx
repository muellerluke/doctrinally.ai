"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { BookOpen, Loader2, Pencil } from "lucide-react";
import { PlateElement, useEditorRef } from "platejs/react";
import type { PlateElementProps } from "platejs/react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/radix-select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

export const BIBLE_PASSAGE_TYPE = "bible_passage";

export interface BiblePassageNode {
  type: typeof BIBLE_PASSAGE_TYPE;
  book: string;
  chapter: number;
  verse: string;
  version: string;
  children: [{ text: "" }];
}

interface BibleBook {
  id: string;
  name: string;
  totalChapters: number;
}

// ---- Passage content (fetches and renders verse text) ----

interface VerseData {
  verse: number;
  text: string;
}

function PassageContent({
  book,
  chapter,
  verse,
}: {
  book: string;
  chapter: number;
  verse: string;
}) {
  const [verses, setVerses] = useState<VerseData[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const prevKey = useRef("");

  useEffect(() => {
    const key = `${book}-${chapter}-${verse}`;
    if (key === prevKey.current && verses !== null) return;
    prevKey.current = key;

    if (!book || !chapter || !verse) {
      setLoading(false);
      setError(true);
      return;
    }

    setLoading(true);
    setError(false);

    const verseParts = String(verse).split("-");
    const params = new URLSearchParams({
      book,
      chapter: String(chapter),
      verseStart: verseParts[0],
    });
    if (verseParts[1]) params.set("verseEnd", verseParts[1]);

    fetch(`/api/bible?${params}`)
      .then((res) => {
        if (!res.ok) throw new Error("Not found");
        return res.json();
      })
      .then((data) => {
        setVerses(data.verses || []);
        setLoading(false);
      })
      .catch(() => {
        setError(true);
        setLoading(false);
      });
  }, [book, chapter, verse, verses]);

  if (loading) {
    return (
      <span className="mt-1.5 flex items-center gap-1.5 text-xs text-amber-700/60 dark:text-amber-400/50">
        <Loader2 className="h-3 w-3 animate-spin" />
        Loading passage...
      </span>
    );
  }

  if (error || !verses || verses.length === 0) {
    return (
      <span className="mt-1 text-xs italic text-amber-700/50 dark:text-amber-400/40">
        Passage not available
      </span>
    );
  }

  return (
    <span className="mt-1.5 block text-sm leading-relaxed text-amber-900/80 dark:text-amber-200/70">
      {verses.map((v, i) => (
        <span key={v.verse}>
          <sup className="mr-0.5 text-[10px] font-semibold text-amber-700/50 dark:text-amber-400/40">
            {v.verse}
          </sup>
          {v.text}
          {i < verses.length - 1 && " "}
        </span>
      ))}
    </span>
  );
}

// ---- Reference editor modal ----

function ReferenceModal({
  open,
  onOpenChange,
  book,
  chapter,
  verse,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  book: string;
  chapter: number;
  verse: string;
  onSave: (book: string, chapter: number, verse: string) => void;
}) {
  const [books, setBooks] = useState<BibleBook[]>([]);
  const [loadingBooks, setLoadingBooks] = useState(true);

  const [selectedBook, setSelectedBook] = useState(book);
  const [totalChapters, setTotalChapters] = useState<number | null>(null);
  const [maxVerse, setMaxVerse] = useState<number | null>(null);

  const [chapterInput, setChapterInput] = useState(String(chapter));
  const [verseInput, setVerseInput] = useState(verse);
  const [chapterError, setChapterError] = useState("");
  const [verseError, setVerseError] = useState("");

  // Fetch books list once
  useEffect(() => {
    if (!open) return;
    fetch("/api/bible/books")
      .then((r) => r.json())
      .then((data) => {
        setBooks(data);
        setLoadingBooks(false);
        // Set totalChapters for current book
        const current = data.find(
          (b: BibleBook) => b.name.toLowerCase() === book.toLowerCase()
        );
        if (current) setTotalChapters(current.totalChapters);
      })
      .catch(() => setLoadingBooks(false));
  }, [open, book]);

  // When book changes, update totalChapters
  const handleBookChange = useCallback(
    (bookName: string) => {
      setSelectedBook(bookName);
      setChapterError("");
      setVerseError("");
      const b = books.find((b) => b.name === bookName);
      if (b) {
        setTotalChapters(b.totalChapters);
        // Reset chapter if out of range
        const ch = parseInt(chapterInput, 10);
        if (ch > b.totalChapters) {
          setChapterInput("1");
        }
      }
    },
    [books, chapterInput]
  );

  // Fetch max verse when book or chapter changes
  useEffect(() => {
    if (!selectedBook || !chapterInput) return;
    const ch = parseInt(chapterInput, 10);
    if (isNaN(ch) || ch < 1) return;

    fetch(
      `/api/bible/chapters?book=${encodeURIComponent(selectedBook)}&chapter=${ch}`
    )
      .then((r) => {
        if (!r.ok) return null;
        return r.json();
      })
      .then((data) => {
        if (data) setMaxVerse(data.maxVerse);
      })
      .catch(() => {});
  }, [selectedBook, chapterInput]);

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      setSelectedBook(book);
      setChapterInput(String(chapter));
      setVerseInput(verse);
      setChapterError("");
      setVerseError("");
    }
  }, [open, book, chapter, verse]);

  function validate(): boolean {
    let valid = true;

    const ch = parseInt(chapterInput, 10);
    if (isNaN(ch) || ch < 1) {
      setChapterError("Enter a valid chapter number");
      valid = false;
    } else if (totalChapters && ch > totalChapters) {
      setChapterError(`${selectedBook} has ${totalChapters} chapters`);
      valid = false;
    } else {
      setChapterError("");
    }

    // Parse verse: single number or range like "16" or "16-18"
    const verseMatch = verseInput.trim().match(/^(\d+)(?:-(\d+))?$/);
    if (!verseMatch) {
      setVerseError('Enter a verse number or range (e.g. "16" or "16-18")');
      valid = false;
    } else {
      const vs = parseInt(verseMatch[1], 10);
      const ve = verseMatch[2] ? parseInt(verseMatch[2], 10) : null;

      if (vs < 1) {
        setVerseError("Verse must be at least 1");
        valid = false;
      } else if (maxVerse && vs > maxVerse) {
        setVerseError(`Max verse for this chapter is ${maxVerse}`);
        valid = false;
      } else if (ve !== null && ve < vs) {
        setVerseError("End verse must be after start verse");
        valid = false;
      } else if (ve !== null && maxVerse && ve > maxVerse) {
        setVerseError(`Max verse for this chapter is ${maxVerse}`);
        valid = false;
      } else {
        setVerseError("");
      }
    }

    return valid;
  }

  function handleSubmit() {
    if (!validate()) return;
    onSave(selectedBook, parseInt(chapterInput, 10), verseInput.trim());
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Edit Bible Reference</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Book dropdown */}
          <div className="space-y-1.5">
            <Label className="text-xs">Book</Label>
            {loadingBooks ? (
              <div className="flex h-9 items-center gap-2 rounded-md border px-3 text-sm text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" />
                Loading...
              </div>
            ) : (
              <Select
                value={selectedBook}
                onValueChange={(v) => v && handleBookChange(v)}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Select a book" />
                </SelectTrigger>
                <SelectContent className="max-h-64">
                  {books.map((b) => (
                    <SelectItem key={b.id} value={b.name}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Chapter */}
          <div className="space-y-1.5">
            <Label className="text-xs">
              Chapter
              {totalChapters && (
                <span className="ml-1 font-normal text-muted-foreground">
                  (1–{totalChapters})
                </span>
              )}
            </Label>
            <Input
              value={chapterInput}
              onChange={(e) => {
                setChapterInput(e.target.value);
                setChapterError("");
              }}
              type="number"
              min={1}
              max={totalChapters ?? undefined}
              className="h-9"
            />
            {chapterError && (
              <p className="text-xs text-destructive">{chapterError}</p>
            )}
          </div>

          {/* Verse */}
          <div className="space-y-1.5">
            <Label className="text-xs">
              Verse(s)
              {maxVerse && (
                <span className="ml-1 font-normal text-muted-foreground">
                  (1–{maxVerse})
                </span>
              )}
            </Label>
            <Input
              value={verseInput}
              onChange={(e) => {
                setVerseInput(e.target.value);
                setVerseError("");
              }}
              placeholder='e.g. "16" or "16-18"'
              className="h-9"
            />
            {verseError && (
              <p className="text-xs text-destructive">{verseError}</p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit}>Update</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---- Main element ----

export function BiblePassageElement(props: PlateElementProps) {
  const { element, children } = props;
  const editor = useEditorRef();
  const node = element as unknown as BiblePassageNode;
  const [modalOpen, setModalOpen] = useState(false);

  const reference = [
    node.book || "Book",
    " ",
    node.chapter || "?",
    ":",
    node.verse || "?",
  ].join("");

  function handleSave(book: string, chapter: number, verse: string) {
    const path = editor.api.findPath(element);
    if (path) {
      editor.tf.setNodes({ book, chapter, verse } as any, { at: path });
    }
  }

  return (
    <PlateElement
      {...props}
      className="my-4 select-none"
      attributes={{
        ...props.attributes,
        contentEditable: false,
      }}
    >
      <div
        className="group cursor-pointer rounded-lg border-l-4 border-amber-600/70 bg-amber-50/60 px-5 py-4 shadow-sm transition-colors hover:bg-amber-50/80 dark:border-amber-500/50 dark:bg-amber-950/20 dark:hover:bg-amber-950/30"
        suppressContentEditableWarning
        onClick={() => setModalOpen(true)}
      >
        <div className="flex items-start gap-3">
          <BookOpen className="mt-0.5 h-5 w-5 shrink-0 text-amber-700 dark:text-amber-400" />
          <div className="min-w-0 flex-1">
            <span className="flex items-center gap-2">
              <span className="font-heading text-sm font-semibold tracking-wide text-amber-900 dark:text-amber-200">
                {reference}
              </span>
              <Pencil className="h-3 w-3 text-amber-700/0 transition-colors group-hover:text-amber-700/50 dark:group-hover:text-amber-400/50" />
            </span>
            <PassageContent
              book={node.book}
              chapter={node.chapter}
              verse={node.verse}
            />
          </div>
        </div>
      </div>

      <ReferenceModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        book={node.book}
        chapter={node.chapter}
        verse={node.verse}
        onSave={handleSave}
      />

      {children}
    </PlateElement>
  );
}
