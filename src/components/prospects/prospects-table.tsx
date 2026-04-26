"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Search } from "lucide-react";
import { DataTable } from "@/components/shared/data-table";
import { Input } from "@/components/ui/input";
import { StatusSelect } from "./status-select";
import type { ProspectStatus } from "@/db/schema/prospects";

export interface ProspectRow {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  status: ProspectStatus;
  sourceType: string;
  sourceUrl: string | null;
  sourcePageTitle: string | null;
  chatId: string | null;
  createdAt: string; // ISO
}

function formatPagePath(url: string | null): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    return u.pathname === "/" ? u.host : u.pathname;
  } catch {
    return url.slice(0, 60);
  }
}

const columns: ColumnDef<ProspectRow>[] = [
  {
    accessorKey: "name",
    header: "Name",
    cell: ({ row }) => (
      <Link
        href={`/prospects/${row.original.id}`}
        className="font-medium text-foreground hover:underline"
      >
        {row.original.name ?? (
          <span className="italic text-muted-foreground">No name</span>
        )}
      </Link>
    ),
  },
  {
    id: "contact",
    header: "Contact",
    cell: ({ row }) => {
      const { email, phone } = row.original;
      if (!email && !phone) {
        return <span className="text-sm text-muted-foreground">—</span>;
      }
      return (
        <div className="space-y-0.5 text-sm">
          {email && (
            <a
              href={`mailto:${email}`}
              className="block truncate text-foreground/80 hover:text-foreground hover:underline"
            >
              {email}
            </a>
          )}
          {phone && (
            <a
              href={`tel:${phone.replace(/[^+\d]/g, "")}`}
              className="block truncate text-xs text-muted-foreground hover:text-foreground hover:underline"
            >
              {phone}
            </a>
          )}
        </div>
      );
    },
  },
  {
    id: "viewing",
    header: "Viewing",
    cell: ({ row }) => {
      const { sourceUrl, sourcePageTitle, sourceType } = row.original;
      const path = formatPagePath(sourceUrl);
      const sourceLabel =
        sourceType === "embed_widget"
          ? null
          : sourceType === "contact_form"
          ? "Contact form"
          : sourceType === "manual"
          ? "Manual entry"
          : sourceType === "import"
          ? "Import"
          : sourceType;
      // Non-widget sources don't carry a page — show the source label
      // instead so the column is never empty.
      if (!path && !sourcePageTitle) {
        return (
          <span className="text-sm text-muted-foreground">
            {sourceLabel ?? "—"}
          </span>
        );
      }
      return (
        <div className="space-y-0.5 text-sm" title={sourceUrl ?? undefined}>
          {sourcePageTitle && (
            <div className="max-w-[260px] truncate text-foreground/80">
              {sourcePageTitle}
            </div>
          )}
          {path && (
            <div className="max-w-[260px] truncate text-xs text-muted-foreground">
              {path}
            </div>
          )}
        </div>
      );
    },
  },
  {
    accessorKey: "createdAt",
    header: "Captured",
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground">
        {new Date(row.original.createdAt).toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
          year: "numeric",
        })}
      </span>
    ),
  },
  {
    id: "status",
    header: "Status",
    cell: ({ row }) => (
      <StatusSelect
        prospectId={row.original.id}
        initial={row.original.status}
      />
    ),
  },
];

interface Props {
  rows: ProspectRow[];
}

export function ProspectsTable({ rows }: Props) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<string>("all");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (status !== "all" && r.status !== status) return false;
      if (!q) return true;
      return (
        (r.name ?? "").toLowerCase().includes(q) ||
        (r.email ?? "").toLowerCase().includes(q) ||
        (r.phone ?? "").toLowerCase().includes(q) ||
        (r.sourcePageTitle ?? "").toLowerCase().includes(q) ||
        (r.sourceUrl ?? "").toLowerCase().includes(q)
      );
    });
  }, [rows, query, status]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, phone, or page..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          {[
            { value: "all", label: "All" },
            { value: "new", label: "New" },
            { value: "contacted", label: "Contacted" },
            { value: "converted", label: "Converted" },
            { value: "archived", label: "Archived" },
          ].map((s) => (
            <button
              key={s.value}
              onClick={() => setStatus(s.value)}
              className={
                "rounded-md border px-3 py-1.5 text-xs font-medium transition " +
                (status === s.value
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background text-muted-foreground hover:text-foreground")
              }
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>
      <DataTable columns={columns} data={filtered} />
    </div>
  );
}
