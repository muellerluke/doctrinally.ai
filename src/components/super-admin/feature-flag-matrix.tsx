"use client";

import { useMemo, useState, useTransition } from "react";
import { Search, Info, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toggleChurchFeatureFlag } from "@/lib/actions/feature-flags";
import type { FeatureFlagDefinition } from "@/lib/feature-flags";

export interface ChurchRow {
  id: string;
  name: string;
  slug: string;
  plan: string | null;
  status: string | null;
  isActive: boolean;
  /**
   * Per-church override map. Missing key = "no override, use default."
   * Explicit false = "override says off." Explicit true = "override
   * says on."
   */
  overrides: Record<string, boolean>;
}

interface Props {
  churches: ChurchRow[];
  flags: FeatureFlagDefinition[];
}

type CellState = "default-on" | "default-off" | "override-on" | "override-off";

function cellState(
  override: boolean | undefined,
  defaultValue: boolean
): CellState {
  if (override === undefined) {
    return defaultValue ? "default-on" : "default-off";
  }
  return override ? "override-on" : "override-off";
}

/**
 * Super-admin matrix: rows = churches, columns = flags.
 *
 * Each cell shows effective state (override > default). A small
 * "override" badge appears when the cell is explicitly set so you
 * can tell "off because default" apart from "off because someone
 * toggled it off for this church." Toggling a cell writes an
 * override; the reset button clears the override back to the flag's
 * default.
 */
export function FeatureFlagMatrix({ churches, flags }: Props) {
  const [query, setQuery] = useState("");
  const [isPending, startTransition] = useTransition();
  // Optimistic state keyed by `${churchId}:${flag}` holding the
  // pending override value. We fall through to `churches` for the
  // settled state. Clears when the server action revalidates.
  const [pending, setPending] = useState<
    Record<string, boolean | null | undefined>
  >({});

  const filteredChurches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return churches;
    return churches.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.slug.toLowerCase().includes(q) ||
        (c.plan ?? "").toLowerCase().includes(q)
    );
  }, [churches, query]);

  function stateFor(church: ChurchRow, flag: FeatureFlagDefinition): CellState {
    const key = `${church.id}:${flag.key}`;
    const pendingVal = pending[key];
    if (pendingVal !== undefined) {
      return cellState(pendingVal ?? undefined, flag.default);
    }
    return cellState(church.overrides[flag.key], flag.default);
  }

  async function flipCell(
    church: ChurchRow,
    flag: FeatureFlagDefinition,
    nextEnabled: boolean
  ) {
    const key = `${church.id}:${flag.key}`;
    setPending((prev) => ({ ...prev, [key]: nextEnabled }));
    startTransition(async () => {
      const result = await toggleChurchFeatureFlag({
        churchId: church.id,
        flag: flag.key,
        enabled: nextEnabled,
      });
      if ("error" in result) {
        toast.error(result.error);
        setPending((prev) => {
          const next = { ...prev };
          delete next[key];
          return next;
        });
        return;
      }
      toast.success(
        `${flag.label}: ${nextEnabled ? "enabled" : "disabled"} for ${church.name}`
      );
      // Leave the optimistic value in place; Next.js revalidation
      // will bring server state back and we'll pick up the authoritative
      // override on next render.
    });
  }

  async function resetCell(
    church: ChurchRow,
    flag: FeatureFlagDefinition
  ) {
    const key = `${church.id}:${flag.key}`;
    setPending((prev) => ({ ...prev, [key]: null }));
    startTransition(async () => {
      const result = await toggleChurchFeatureFlag({
        churchId: church.id,
        flag: flag.key,
        enabled: null,
      });
      if ("error" in result) {
        toast.error(result.error);
        setPending((prev) => {
          const next = { ...prev };
          delete next[key];
          return next;
        });
        return;
      }
      toast.success(
        `${flag.label}: reset to default (${flag.default ? "on" : "off"}) for ${church.name}`
      );
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search church name, slug, plan..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="text-xs text-muted-foreground">
          {filteredChurches.length}{" "}
          {filteredChurches.length === 1 ? "church" : "churches"} ·{" "}
          {flags.length} {flags.length === 1 ? "flag" : "flags"}
        </div>
      </div>

      <TooltipProvider delay={150}>
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[200px] bg-muted/20">
                  Church
                </TableHead>
                {flags.map((f) => (
                  <TableHead key={f.key} className="min-w-[180px]">
                    <div className="flex items-center gap-1.5">
                      <span className="font-medium">{f.label}</span>
                      <Tooltip>
                        <TooltipTrigger
                          render={
                            <button
                              type="button"
                              className="inline-flex cursor-help"
                              aria-label={`About ${f.label}`}
                            >
                              <Info className="h-3.5 w-3.5 text-muted-foreground/60 hover:text-muted-foreground" />
                            </button>
                          }
                        />
                        <TooltipContent className="max-w-md">
                          <div>
                            <p className="text-xs font-medium">{f.label}</p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {f.description}
                            </p>
                            <p className="mt-2 text-[10px] uppercase tracking-wide text-muted-foreground/60">
                              Default: {f.default ? "on" : "off"} · Category:{" "}
                              {f.category}
                            </p>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredChurches.map((church) => (
                <TableRow key={church.id}>
                  <TableCell className="bg-muted/10">
                    <div className="flex items-center gap-2">
                      <div>
                        <div className="font-medium text-foreground">
                          {church.name}
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          {church.slug}
                          {church.plan && (
                            <>
                              {" · "}
                              <span className="uppercase">{church.plan}</span>
                            </>
                          )}
                        </div>
                      </div>
                      {!church.isActive && (
                        <Badge
                          variant="secondary"
                          className="text-[9px] uppercase"
                        >
                          Inactive
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  {flags.map((f) => {
                    const state = stateFor(church, f);
                    const isOverride =
                      state === "override-on" || state === "override-off";
                    const effective =
                      state === "default-on" || state === "override-on";
                    return (
                      <TableCell key={f.key} className="align-middle">
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={effective}
                            onCheckedChange={(v) => flipCell(church, f, v)}
                            disabled={isPending}
                          />
                          {isOverride ? (
                            <div className="flex items-center gap-1">
                              <Badge
                                variant="secondary"
                                className="px-1.5 py-0 text-[9px] uppercase tracking-wide"
                              >
                                Override
                              </Badge>
                              <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                className="h-6 w-6"
                                title="Reset to default"
                                onClick={() => resetCell(church, f)}
                                disabled={isPending}
                              >
                                <RotateCcw className="h-3 w-3" />
                              </Button>
                            </div>
                          ) : (
                            <span className="text-[10px] text-muted-foreground/60">
                              default
                            </span>
                          )}
                        </div>
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </TooltipProvider>
    </div>
  );
}
