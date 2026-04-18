"use client";

import { useState, useCallback, useRef } from "react";
import type { Citation } from "@/lib/types/citations";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations?: Citation[];
  stableUpTo?: number;
}

interface UseChatOptions {
  churchId: string;
  churchName: string;
  initialChatId?: string;
  initialMessages?: ChatMessage[];
  isAdminTest?: boolean;
}

interface UseChatReturn {
  messages: ChatMessage[];
  chatId: string | null;
  input: string;
  setInput: (value: string) => void;
  isLoading: boolean;
  error: string | null;
  sendMessage: () => void;
  reset: () => void;
}

const CITATION_SENTINEL = "\n__CITATIONS__";
const CHAT_ID_SENTINEL = "\n__CHAT_ID__";
const CHUNK_BOUNDARY = "\u200B\u200B";
const REVEAL_MS = 280;

let messageCounter = 0;
function genId() {
  return `msg_${Date.now()}_${++messageCounter}`;
}

/**
 * Extract citations JSON and chatId from the end of a streamed response.
 */
function extractStreamMetadata(raw: string): {
  text: string;
  citations: Citation[];
  chatId?: string;
} {
  let text = raw;
  let citations: Citation[] = [];
  let chatId: string | undefined;

  // Extract chatId sentinel
  const chatIdIdx = text.indexOf(CHAT_ID_SENTINEL);
  if (chatIdIdx !== -1) {
    const afterChatId = text.slice(chatIdIdx + CHAT_ID_SENTINEL.length);
    const newlineIdx = afterChatId.indexOf("\n");
    chatId = newlineIdx === -1 ? afterChatId : afterChatId.slice(0, newlineIdx);
    text = text.slice(0, chatIdIdx) + (newlineIdx === -1 ? "" : afterChatId.slice(newlineIdx));
  }

  // Extract citations sentinel
  const citIdx = text.indexOf(CITATION_SENTINEL);
  if (citIdx !== -1) {
    const jsonStr = text.slice(citIdx + CITATION_SENTINEL.length);
    text = text.slice(0, citIdx);
    try {
      citations = JSON.parse(jsonStr) as Citation[];
    } catch {
      // ignore
    }
  }

  return { text, citations, chatId };
}

export function useChat({
  churchId,
  churchName,
  initialChatId,
  initialMessages,
  isAdminTest,
}: UseChatOptions): UseChatReturn {
  const [messages, setMessages] = useState<ChatMessage[]>(
    initialMessages ?? []
  );
  const [chatId, setChatId] = useState<string | null>(initialChatId ?? null);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const chatIdRef = useRef<string | null>(initialChatId ?? null);
  const revealTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearRevealTimers = useCallback(() => {
    for (const t of revealTimersRef.current) clearTimeout(t);
    revealTimersRef.current = [];
  }, []);

  const sendMessage = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;

    setError(null);
    setInput("");

    const userMsg: ChatMessage = {
      id: genId(),
      role: "user",
      content: trimmed,
    };

    const assistantMsg: ChatMessage = {
      id: genId(),
      role: "assistant",
      content: "",
    };

    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setIsLoading(true);

    const allMessages = [
      ...messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
      { role: "user" as const, content: trimmed },
    ];

    try {
      abortRef.current = new AbortController();

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: allMessages,
          churchId,
          churchName,
          chatId: chatIdRef.current,
          isAdminTest: isAdminTest || undefined,
        }),
        signal: abortRef.current.signal,
      });

      if (!response.ok) {
        if (response.status === 403) {
          try {
            const body = await response.json();
            if (body.error === "message_limit_reached") {
              setError(body.message ?? "Monthly message limit reached.");
              setMessages((prev) => {
                const last = prev[prev.length - 1];
                if (last?.role === "assistant" && !last.content) {
                  return prev.slice(0, -1);
                }
                return prev;
              });
              return;
            }
          } catch {
            // Not JSON — fall through to generic error
          }
        }
        throw new Error(`Chat request failed: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let rawBuffer = "";
      let displayText = "";
      const assistantId = assistantMsg.id;

      const scheduleStableAdvance = (target: number) => {
        const timer = setTimeout(() => {
          setMessages((prev) => {
            const idx = prev.findIndex((m) => m.id === assistantId);
            if (idx === -1) return prev;
            const current = prev[idx];
            if ((current.stableUpTo ?? 0) >= target) return prev;
            const clamped = Math.min(target, current.content.length);
            if (clamped === current.stableUpTo) return prev;
            const updated = [...prev];
            updated[idx] = { ...current, stableUpTo: clamped };
            return updated;
          });
        }, REVEAL_MS);
        revealTimersRef.current.push(timer);
      };

      const stripSentinels = (text: string) => {
        let out = text;
        const citIdx = out.indexOf(CITATION_SENTINEL);
        if (citIdx !== -1) out = out.slice(0, citIdx);
        const chatIdIdx = out.indexOf(CHAT_ID_SENTINEL);
        if (chatIdIdx !== -1) out = out.slice(0, chatIdIdx);
        return out;
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        rawBuffer += chunk;

        // Split on the invisible chunk boundary emitted by the server.
        // Any segment after a boundary is "new text just arrived".
        const parts = chunk.split(CHUNK_BOUNDARY);

        // parts[0] belongs to whatever segment is currently open.
        // Subsequent parts are fresh server-side chunks.
        const preBoundary = parts[0];
        const freshChunks = parts.slice(1);

        if (preBoundary) {
          // Extend the latest pending slice with any trailing text in this read.
          displayText += preBoundary;
          const clean = stripSentinels(displayText);
          setMessages((prev) => {
            const idx = prev.findIndex((m) => m.id === assistantId);
            if (idx === -1) return prev;
            const updated = [...prev];
            updated[idx] = { ...updated[idx], content: clean };
            return updated;
          });
        }

        for (const fresh of freshChunks) {
          // Freeze the pre-existing content as "stable" before appending new.
          const priorLen = stripSentinels(displayText).length;
          displayText += fresh;
          const clean = stripSentinels(displayText);

          setMessages((prev) => {
            const idx = prev.findIndex((m) => m.id === assistantId);
            if (idx === -1) return prev;
            const current = prev[idx];
            const updated = [...prev];
            updated[idx] = {
              ...current,
              content: clean,
              stableUpTo: Math.min(priorLen, clean.length),
            };
            return updated;
          });

          // Schedule promotion: after REVEAL_MS, this chunk settles.
          scheduleStableAdvance(clean.length);
        }
      }

      // Final: extract citations and chatId from the raw buffered stream
      const { text: cleanText, citations, chatId: newChatId } =
        extractStreamMetadata(rawBuffer.split(CHUNK_BOUNDARY).join(""));

      if (newChatId) {
        chatIdRef.current = newChatId;
        setChatId(newChatId);
      }

      clearRevealTimers();

      setMessages((prev) => {
        const idx = prev.findIndex((m) => m.id === assistantId);
        if (idx === -1) return prev;
        const updated = [...prev];
        updated[idx] = {
          ...updated[idx],
          content: cleanText,
          citations,
          stableUpTo: cleanText.length,
        };
        return updated;
      });

      window.plausible?.("Chat Message");
    } catch (err) {
      clearRevealTimers();
      if ((err as Error).name === "AbortError") return;
      setError((err as Error).message);
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant" && !last.content) {
          return prev.slice(0, -1);
        }
        return prev;
      });
    } finally {
      setIsLoading(false);
      abortRef.current = null;
    }
  }, [input, isLoading, messages, churchId, churchName, isAdminTest, clearRevealTimers]);

  const reset = useCallback(() => {
    if (abortRef.current) abortRef.current.abort();
    clearRevealTimers();
    setMessages([]);
    setChatId(null);
    chatIdRef.current = null;
    setInput("");
    setIsLoading(false);
    setError(null);
  }, [clearRevealTimers]);

  return {
    messages,
    chatId,
    input,
    setInput,
    isLoading,
    error,
    sendMessage,
    reset,
  };
}
