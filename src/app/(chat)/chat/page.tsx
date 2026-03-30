import { MessageSquare } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function ChatPage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 p-4">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
        <MessageSquare className="h-8 w-8 text-muted-foreground" />
      </div>
      <div className="text-center">
        <h1 className="text-2xl font-bold">Ask a question</h1>
        <p className="mt-1 text-muted-foreground">
          Get answers from the Bible and your church&apos;s teachings
        </p>
      </div>
      <div className="flex w-full max-w-2xl gap-2">
        <Input
          placeholder="What would you like to know?"
          className="flex-1"
        />
        <Button>Send</Button>
      </div>
    </div>
  );
}
