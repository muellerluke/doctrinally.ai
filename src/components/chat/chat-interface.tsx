"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { MessageSquare, Sparkles } from "lucide-react";
import { useChat, type ChatMessage } from "@/lib/hooks/use-chat";
import { ChatMessages } from "@/components/chat/chat-messages";
import { ChatInput } from "@/components/chat/chat-input";

interface ChatInterfaceProps {
  churchId: string;
  churchName: string;
  welcomeMessage?: string;
  chatId?: string;
  initialMessages?: ChatMessage[];
}

const SUGGESTED_QUESTIONS = [
  "What does the Bible say about forgiveness?",
  "How can I grow in my faith?",
  "What are the core beliefs of our church?",
  "Can you explain the Gospel simply?",
];

export function ChatInterface({
  churchId,
  churchName,
  welcomeMessage,
  chatId: initialChatId,
  initialMessages,
}: ChatInterfaceProps) {
  const router = useRouter();
  const {
    messages,
    chatId,
    input,
    setInput,
    isLoading,
    error,
    sendMessage,
  } = useChat({
    churchId,
    churchName,
    initialChatId,
    initialMessages,
  });

  // Update URL when a new chatId is received (first message in a new conversation)
  const prevChatIdRef = useRef(initialChatId);
  useEffect(() => {
    if (chatId && chatId !== prevChatIdRef.current) {
      prevChatIdRef.current = chatId;
      router.replace(`/chat/${chatId}`, { scroll: false });
    }
  }, [chatId, router]);

  const hasMessages = messages.length > 0;

  return (
    <div className="flex flex-1 flex-col">
      {!hasMessages ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-8 p-4">
          <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10">
            <MessageSquare className="h-9 w-9 text-primary" />
          </div>
          <div className="text-center">
            <h1 className="font-heading text-3xl sm:text-4xl">
              Ask a question
            </h1>
            <p className="mt-2 text-muted-foreground">
              {welcomeMessage ||
                `Get answers from the Bible and ${churchName}'s teachings`}
            </p>
          </div>

          <div className="grid w-full max-w-2xl gap-2 sm:grid-cols-2">
            {SUGGESTED_QUESTIONS.map((q) => (
              <button
                key={q}
                onClick={() => setInput(q)}
                className="flex items-center gap-2 rounded-xl border bg-card px-4 py-3 text-left text-sm text-muted-foreground transition-colors hover:border-primary/30 hover:text-foreground"
              >
                <Sparkles className="mb-1 h-3.5 w-3.5 text-primary/60" />
                {q}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <ChatMessages messages={messages} isStreaming={isLoading} />
      )}

      {error && (
        <div className="mx-auto max-w-3xl px-4">
          <div className="rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2 text-xs text-destructive">
            {error}
          </div>
        </div>
      )}

      <ChatInput
        value={input}
        onChange={setInput}
        onSubmit={sendMessage}
        isLoading={isLoading}
      />
    </div>
  );
}
