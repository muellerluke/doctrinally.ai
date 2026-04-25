"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { updateProspectStatus } from "@/lib/actions/prospects";
import type { ProspectStatus } from "@/db/schema/prospects";

const STATUSES: { value: ProspectStatus; label: string; className: string }[] = [
  {
    value: "new",
    label: "New",
    className: "text-blue-600 dark:text-blue-400",
  },
  {
    value: "contacted",
    label: "Contacted",
    className: "text-amber-600 dark:text-amber-400",
  },
  {
    value: "converted",
    label: "Converted",
    className: "text-emerald-600 dark:text-emerald-400",
  },
  {
    value: "archived",
    label: "Archived",
    className: "text-muted-foreground",
  },
];

interface Props {
  prospectId: string;
  initial: ProspectStatus;
}

export function StatusSelect({ prospectId, initial }: Props) {
  const [value, setValue] = useState<ProspectStatus>(initial);
  const [isPending, startTransition] = useTransition();
  const meta =
    STATUSES.find((s) => s.value === value) ?? STATUSES[0];

  function handleChange(next: string | null) {
    if (next == null) return;
    const nextStatus = next as ProspectStatus;
    setValue(nextStatus);
    startTransition(async () => {
      const result = await updateProspectStatus(prospectId, nextStatus);
      if (result.error) {
        toast.error(result.error);
        setValue(initial);
      }
    });
  }

  return (
    <Select value={value} onValueChange={handleChange} disabled={isPending}>
      <SelectTrigger
        className={cn(
          "h-8 w-[130px] text-xs font-medium",
          meta.className
        )}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {STATUSES.map((s) => (
          <SelectItem
            key={s.value}
            value={s.value}
            className={cn("text-xs font-medium", s.className)}
          >
            {s.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
