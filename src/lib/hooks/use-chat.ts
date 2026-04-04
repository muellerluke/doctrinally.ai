"use client";

import { useState, useCallback, useRef } from "react";
import type { Citation } from "@/lib/types/citations";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations?: Citation[];
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
        throw new Error(`Chat request failed: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let fullText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        fullText += chunk;

        // During streaming, strip sentinels from display
        let displayText = fullText;
        const citIdx = displayText.indexOf(CITATION_SENTINEL);
        if (citIdx !== -1) displayText = displayText.slice(0, citIdx);
        const chatIdIdx = displayText.indexOf(CHAT_ID_SENTINEL);
        if (chatIdIdx !== -1) displayText = displayText.slice(0, chatIdIdx);

        setMessages((prev) => {
          const updated = [...prev];
          const last = updated[updated.length - 1];
          if (last && last.role === "assistant") {
            updated[updated.length - 1] = {
              ...last,
              content: displayText,
            };
          }
          return updated;
        });
      }

      // Final: extract citations and chatId
      const { text: cleanText, citations, chatId: newChatId } =
        extractStreamMetadata(fullText);

      if (newChatId) {
        chatIdRef.current = newChatId;
        setChatId(newChatId);
      }

      setMessages((prev) => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        if (last && last.role === "assistant") {
          updated[updated.length - 1] = {
            ...last,
            content: cleanText,
            citations,
          };
        }
        return updated;
      });
    } catch (err) {
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
  }, [input, isLoading, messages, churchId, churchName]);

  const reset = useCallback(() => {
    if (abortRef.current) abortRef.current.abort();
    setMessages([]);
    setChatId(null);
    chatIdRef.current = null;
    setInput("");
    setIsLoading(false);
    setError(null);
  }, []);

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
