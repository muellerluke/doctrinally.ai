"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { PlanType } from "@/lib/plans";
import { PLANS } from "@/lib/plans";

interface PlanCardProps {
  plan: PlanType;
  selected?: boolean;
  onSelect?: (plan: PlanType) => void;
  current?: boolean;
}

export function PlanCard({ plan, selected, onSelect, current }: PlanCardProps) {
  const details = PLANS[plan];
  const isEnterprise = plan === "enterprise";

  return (
    <Card
      className={cn(
        "relative cursor-pointer transition-all duration-200",
        selected
          ? "border-primary ring-2 ring-primary/20 shadow-lg"
          : "border-border hover:border-primary/40 hover:shadow-md",
        current && "border-gold ring-2 ring-gold/20"
      )}
      onClick={() => onSelect?.(plan)}
    >
      {current && (
        <Badge className="absolute -top-2.5 right-4 border-gold/30 bg-gold/15 text-gold text-xs">
          Current plan
        </Badge>
      )}
      {isEnterprise && !current && (
        <Badge className="absolute -top-2.5 right-4 border-primary/30 bg-primary/10 text-primary text-xs">
          Most powerful
        </Badge>
      )}
      <CardHeader className="pb-3">
        <div className="flex items-baseline justify-between">
          <h3 className="font-heading text-xl">{details.name}</h3>
          <div className="text-right">
            <span className="font-heading text-3xl tracking-tight">
              ${details.price}
            </span>
            <span className="text-sm text-muted-foreground">/mo</span>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">{details.description}</p>
      </CardHeader>
      <CardContent className="space-y-2">
        {details.highlights.map((highlight) => (
          <div key={highlight} className="flex items-start gap-2 text-sm">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
            <span>{highlight}</span>
          </div>
        ))}
        <div className="mt-3 rounded-md bg-muted/50 p-2.5 text-xs text-muted-foreground">
          Overages: ${0.5}/upload &middot; ${0.25}/question beyond limits
        </div>
      </CardContent>
    </Card>
  );
}
