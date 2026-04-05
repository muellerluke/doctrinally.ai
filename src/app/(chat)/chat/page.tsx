import { getCurrentChurch } from "@/lib/church-context";
import { ChatInterface } from "@/components/chat/chat-interface";

export default async function ChatPage() {
  const church = await getCurrentChurch();

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
    />
  );
}
