"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/shared/data-table";
import { Badge } from "@/components/ui/badge";

interface Member {
  membershipId: string;
  userId: string;
  name: string;
  email: string;
  role: string;
  joinedAt: Date;
}

const roleBadgeColors: Record<string, string> = {
  owner: "border-primary/30 bg-primary/10 text-primary",
  admin: "border-gold/30 bg-gold/15 text-gold",
  member: "border-muted-foreground/20 bg-muted text-muted-foreground",
};

const columns: ColumnDef<Member>[] = [
  { accessorKey: "name", header: "Name" },
  { accessorKey: "email", header: "Email" },
  {
    accessorKey: "role",
    header: "Role",
    cell: ({ row }) => (
      <Badge className={roleBadgeColors[row.original.role] ?? ""}>
        {row.original.role}
      </Badge>
    ),
  },
  {
    accessorKey: "joinedAt",
    header: "Joined",
    cell: ({ row }) => new Date(row.original.joinedAt).toLocaleDateString(),
  },
];

export function MembersDirectoryTable({ members }: { members: Member[] }) {
  return <DataTable columns={columns} data={members} />;
}
