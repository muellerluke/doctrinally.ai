"use client";

import { BookOpen } from "lucide-react";
import { PlateElement } from "platejs/react";
import type { PlateElementProps } from "platejs/react";

export const BIBLE_PASSAGE_TYPE = "bible_passage";

export interface BiblePassageNode {
  type: typeof BIBLE_PASSAGE_TYPE;
  book: string;
  chapter: number;
  verse: string;
  version: string;
  children: [{ text: "" }];
}

export function BiblePassageElement(props: PlateElementProps) {
  const { element, children, ...rest } = props;
  const node = element as unknown as BiblePassageNode;

  const reference = [
    node.book || "Book",
    " ",
    node.chapter || "?",
    ":",
    node.verse || "?",
    node.version ? ` (${node.version})` : "",
  ].join("");

  return (
    <PlateElement
      {...props}
      className="my-4 select-none"
      attributes={{
        ...props.attributes,
        contentEditable: false,
      }}
    >
      <div className="flex items-start gap-3 rounded-lg border-l-4 border-amber-600/70 bg-amber-50/60 px-5 py-4 shadow-sm dark:border-amber-500/50 dark:bg-amber-950/20">
        <BookOpen className="mt-0.5 h-5 w-5 shrink-0 text-amber-700 dark:text-amber-400" />
        <div className="min-w-0 flex-1">
          <p className="font-heading text-sm font-semibold tracking-wide text-amber-900 dark:text-amber-200">
            {reference}
          </p>
          <p className="mt-1 text-xs italic text-amber-700/70 dark:text-amber-400/60">
            Passage text will be loaded from API
          </p>
        </div>
      </div>
      {children}
    </PlateElement>
  );
}
