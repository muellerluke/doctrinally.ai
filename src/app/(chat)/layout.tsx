import { getCurrentChurch } from "@/lib/church-context";
import { ChatSidebar } from "@/components/chat/chat-sidebar";
import { BookOpen } from "lucide-react";

export default async function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const church = await getCurrentChurch();

  // No church found on this subdomain/domain
  if (!church) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 p-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
          <BookOpen className="h-8 w-8 text-muted-foreground" />
        </div>
        <h1 className="font-heading text-2xl">Church not found</h1>
        <p className="text-muted-foreground">
          This church doesn&apos;t exist or hasn&apos;t been set up yet.
        </p>
      </div>
    );
  }

  // Build CSS custom properties from church branding
  const brandingVars: Record<string, string> = {};
  if (church.primaryColor) brandingVars["--church-primary"] = church.primaryColor;
  if (church.accentColor) brandingVars["--church-accent"] = church.accentColor;
  if (church.backgroundColor) brandingVars["--church-bg"] = church.backgroundColor;
  if (church.textColor) brandingVars["--church-text"] = church.textColor;

  return (
    <div className="flex h-screen" style={brandingVars as React.CSSProperties}>
      <ChatSidebar
        churchName={church.name}
        churchLogoUrl={church.logoUrl}
      />
      <div className="flex flex-1 flex-col">{children}</div>
    </div>
  );
}
