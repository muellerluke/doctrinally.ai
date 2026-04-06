"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  refineAndSaveAiFallback,
  clearAiFallback,
} from "@/lib/actions/settings";

interface AiFallbackFormProps {
  currentInstruction: string | null;
}

export function AiFallbackForm({ currentInstruction }: AiFallbackFormProps) {
  const router = useRouter();
  const [rawInput, setRawInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [refined, setRefined] = useState<string | null>(currentInstruction);

  async function handleSave() {
    if (!rawInput.trim()) return;
    setSaving(true);
    try {
      const result = await refineAndSaveAiFallback(rawInput.trim());
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      setRefined(result.refinedInstruction);
      setRawInput("");
      toast.success("Fallback behavior saved");
      router.refresh();
    } catch {
      toast.error("Failed to save fallback behavior");
    } finally {
      setSaving(false);
    }
  }

  async function handleClear() {
    setClearing(true);
    try {
      const result = await clearAiFallback();
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      setRefined(null);
      toast.success("Reset to default behavior");
      router.refresh();
    } catch {
      toast.error("Failed to reset");
    } finally {
      setClearing(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-heading text-xl">
          Fallback Behavior
        </CardTitle>
        <CardDescription>
          Control how the chatbot responds when no relevant content is found in
          your church&apos;s library.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="ai-fallback">
            When no relevant content is found, how should the chatbot respond?
          </Label>
          <Textarea
            id="ai-fallback"
            rows={3}
            value={rawInput}
            onChange={(e) => setRawInput(e.target.value)}
            placeholder='e.g. "Respond in a way that fits the Wisconsin Lutheran Synod" or "Tell the user to talk to a pastor"'
            disabled={saving}
          />
          <p className="text-xs text-muted-foreground">
            Describe in plain language how the chatbot should handle unanswered
            questions. Your instruction will be refined by AI into a system
            prompt.
          </p>
        </div>

        <Button
          onClick={handleSave}
          disabled={saving || !rawInput.trim()}
        >
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {saving ? "Refining & saving..." : "Save"}
        </Button>

        <div className="space-y-2">
          <Label className="text-sm font-medium">Current instruction</Label>
          {refined ? (
            <div className="rounded-lg bg-muted p-3 text-sm leading-relaxed">
              {refined}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
              Default: The chatbot will draw on general biblical knowledge and
              clearly indicate when doing so.
            </div>
          )}
          {refined && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClear}
              disabled={clearing}
              className="text-muted-foreground"
            >
              {clearing ? (
                <Loader2 className="mr-2 h-3 w-3 animate-spin" />
              ) : (
                <RotateCcw className="mr-2 h-3 w-3" />
              )}
              Reset to default
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
