import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getCurrentChurch } from "@/lib/church-context";
import { ChatInterface } from "@/components/chat/chat-interface";

export default async function ChatPage() {
  const [church, session] = await Promise.all([
    getCurrentChurch(),
    getServerSession(authOptions),
  ]);

  if (!church) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-muted-foreground">Church not found</p>
      </div>
    );
  }

  return (
    <ChatInterface
      churchId={church.id}
      churchName={church.name}
      churchLogoUrl={church.logoUrl}
      welcomeMessage={church.welcomeMessage ?? undefined}
      isAuthenticated={!!session?.user?.id}
      isDemo={church.slug === "example"}
    />
  );
}
