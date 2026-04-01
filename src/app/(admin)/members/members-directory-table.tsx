"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/shared/data-table";

interface Member {
  membershipId: string;
  userId: string;
  name: string;
  email: string;
  role: string;
  joinedAt: Date;
}

const columns: ColumnDef<Member>[] = [
  { accessorKey: "name", header: "Name" },
  { accessorKey: "email", header: "Email" },
  {
    accessorKey: "joinedAt",
    header: "Joined",
    cell: ({ row }) => new Date(row.original.joinedAt).toLocaleDateString(),
  },
];

export function MembersDirectoryTable({ members }: { members: Member[] }) {
  return <DataTable columns={columns} data={members} />;
}
