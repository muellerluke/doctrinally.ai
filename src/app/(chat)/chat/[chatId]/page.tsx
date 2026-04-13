import { redirect, notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getCurrentChurch } from "@/lib/church-context";
import { getChatMessages } from "@/lib/actions/chats";
import { ChatInterface } from "@/components/chat/chat-interface";
import type { Citation } from "@/lib/types/citations";

export default async function ChatHistoryPage({
  params,
}: {
  params: Promise<{ chatId: string }>;
}) {
  const { chatId } = await params;
  const church = await getCurrentChurch();

  if (!church) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-muted-foreground">Church not found</p>
      </div>
    );
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/chat");
  }

  const result = await getChatMessages(chatId);
  if ("error" in result) {
    notFound();
  }

  const initialMessages = result.messages.map((m) => ({
    id: m.id,
    role: m.role as "user" | "assistant",
    content: m.content,
    citations: (m.citations as Citation[] | null) ?? undefined,
  }));

  return (
    <ChatInterface
      churchId={church.id}
      churchName={church.name}
      churchLogoUrl={church.logoUrl}
      welcomeMessage={church.welcomeMessage ?? undefined}
      chatId={chatId}
      initialMessages={initialMessages}
      isAuthenticated
      isDemo={church.slug === "example"}
    />
  );
}
