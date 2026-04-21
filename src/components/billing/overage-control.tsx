"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ShieldCheck, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { updateOverageSettings } from "@/lib/actions/billing";
import { OVERAGE_RATES, type PlanType } from "@/lib/plans";

interface OverageControlProps {
  churchId: string;
  enabled: boolean;
  cap: number;
  questionLimit: number;
  plan: PlanType;
}

export function OverageControl({
  churchId,
  enabled: initialEnabled,
  cap: initialCap,
  questionLimit,
  plan,
}: OverageControlProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [enabled, setEnabled] = useState(initialEnabled);
  const [cap, setCap] = useState(initialCap || 100);
  const hasChanges = enabled !== initialEnabled || (enabled && cap !== initialCap);

  const perMessage = OVERAGE_RATES[plan].question;
  const maxCost = (cap * perMessage).toFixed(2);

  async function handleSave() {
    startTransition(async () => {
      const result = await updateOverageSettings(churchId, { enabled, cap });
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Overage settings updated");
        router.refresh();
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Message Overage</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-0.5">
            <Label htmlFor="overage-switch" className="text-sm font-medium">
              Allow messages beyond plan limit
            </Label>
            <p className="text-xs text-muted-foreground">
              When off, members are blocked at {questionLimit.toLocaleString()} messages
            </p>
          </div>
          <Switch
            id="overage-switch"
            checked={enabled}
            onCheckedChange={setEnabled}
          />
        </div>

        {enabled ? (
          <div className="space-y-4 rounded-lg border bg-muted/30 p-4">
            <div className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
              <p className="text-xs text-muted-foreground">
                Extra messages beyond your {questionLimit.toLocaleString()} monthly
                limit will be billed at ${perMessage.toFixed(2)} each, up to the
                cap you set below.
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm">Maximum extra messages</Label>
                <span className="font-heading text-lg tabular-nums">
                  {cap.toLocaleString()}
                </span>
              </div>
              <Slider
                min={100}
                max={5000}
                step={100}
                value={cap}
                onChange={setCap}
              />
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>100</span>
                <span>5,000</span>
              </div>
            </div>

            <div className="rounded-md border border-amber-500/20 bg-amber-500/5 px-3 py-2">
              <p className="text-sm">
                <span className="font-medium">Max overage charge:</span>{" "}
                <span className="font-heading tabular-nums">${maxCost}</span>
                <span className="text-muted-foreground">/month</span>
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Effective limit: {(questionLimit + cap).toLocaleString()} messages total
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-2 rounded-lg border bg-muted/30 p-4">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
            <p className="text-xs text-muted-foreground">
              Members will be blocked when the monthly limit of{" "}
              {questionLimit.toLocaleString()} messages is reached. No overage
              charges will apply.
            </p>
          </div>
        )}

        {hasChanges && (
          <Button onClick={handleSave} disabled={isPending} className="w-full sm:w-auto">
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save overage settings
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
