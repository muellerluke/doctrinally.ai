import { MessageSquare, ArrowRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function ChatPage() {
  return (
    <div className="parchment-texture flex flex-1 flex-col items-center justify-center gap-8 bg-gradient-to-b from-primary/[0.03] to-background p-4">
      <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10">
        <MessageSquare className="h-9 w-9 text-primary" />
      </div>
      <div className="text-center">
        <h1 className="font-heading text-3xl sm:text-4xl">Ask a question</h1>
        <p className="mt-2 text-muted-foreground">
          Get answers from the Bible and your church&apos;s teachings
        </p>
      </div>
      <div className="flex w-full max-w-2xl gap-2">
        <Input
          placeholder="What would you like to know?"
          className="flex-1 bg-card"
        />
        <Button>
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
