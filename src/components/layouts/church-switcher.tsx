"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronsUpDown, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { setActiveChurch } from "@/lib/actions/active-church";
import { cn } from "@/lib/utils";

type Church = {
  churchId: string;
  churchName: string;
  role: "owner" | "admin" | "member";
};

interface ChurchSwitcherProps {
  churches: Church[];
  activeChurchId: string;
}

export function ChurchSwitcher({ churches, activeChurchId }: ChurchSwitcherProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const active = churches.find((c) => c.churchId === activeChurchId);

  function handleSelect(churchId: string) {
    if (churchId === activeChurchId) {
      setOpen(false);
      return;
    }
    startTransition(async () => {
      const result = await setActiveChurch(churchId);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      setOpen(false);
      router.push("/dashboard");
      router.refresh();
    });
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger
        disabled={isPending}
        className={cn(
          "flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-sm font-medium text-sidebar-foreground outline-none transition hover:bg-sidebar-accent focus-visible:bg-sidebar-accent disabled:opacity-60"
        )}
      >
        <span className="truncate">
          {active?.churchName ?? "Select a church"}
        </span>
        {isPending ? (
          <Loader2 className="h-4 w-4 shrink-0 animate-spin text-sidebar-foreground/60" />
        ) : (
          <ChevronsUpDown className="h-4 w-4 shrink-0 text-sidebar-foreground/60" />
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent
        side="top"
        align="start"
        className="min-w-[14rem]"
      >
        <DropdownMenuGroup>
          <DropdownMenuLabel>Switch church</DropdownMenuLabel>
          {churches.map((church) => {
            const isActive = church.churchId === activeChurchId;
            return (
              <DropdownMenuItem
                key={church.churchId}
                onClick={() => handleSelect(church.churchId)}
                className="flex items-start gap-2"
              >
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-sm font-medium">
                    {church.churchName}
                  </span>
                  <span className="text-xs capitalize text-muted-foreground">
                    {church.role}
                  </span>
                </div>
                {isActive && (
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                )}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
