"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import type { Citation } from "@/lib/types/citations";
import { CitationCard } from "@/components/chat/citation-card";

interface CitationBadgeProps {
  citation: Citation;
}

export function CitationBadge({ citation }: CitationBadgeProps) {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  const updatePosition = useCallback(() => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const cardWidth = 320; // w-80
    const cardHeight = 280; // approximate max height
    const padding = 8;

    // Horizontal: center on button, but clamp within viewport
    let left = rect.left + rect.width / 2 - cardWidth / 2;
    left = Math.max(padding, Math.min(left, window.innerWidth - cardWidth - padding));

    // Vertical: prefer above the badge, fall back to below
    let top = rect.top - cardHeight - 6;
    if (top < padding) {
      top = rect.bottom + 6;
    }

    setPos({ top, left });
  }, []);

  useEffect(() => {
    if (!open) return;
    updatePosition();

    function handleClickOutside(e: MouseEvent) {
      if (
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node) &&
        cardRef.current &&
        !cardRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }

    function handleScroll() {
      setOpen(false);
    }

    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("scroll", handleScroll, true);
    window.addEventListener("resize", updatePosition);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("scroll", handleScroll, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [open, updatePosition]);

  return (
    <>
      <button
        ref={buttonRef}
        onClick={() => setOpen(!open)}
        className="mx-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded bg-primary/15 px-1 text-[10px] font-semibold text-primary transition-colors hover:bg-primary/25"
      >
        {citation.index}
      </button>
      {open &&
        pos &&
        createPortal(
          <div
            ref={cardRef}
            className="fixed z-[100]"
            style={{ top: pos.top, left: pos.left }}
          >
            <CitationCard
              citation={citation}
              onClose={() => setOpen(false)}
            />
          </div>,
          document.body
        )}
    </>
  );
}
