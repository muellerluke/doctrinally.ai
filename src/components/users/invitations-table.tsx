"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal } from "lucide-react";
import { toast } from "sonner";
import { DataTable } from "@/components/shared/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { revokeInvitation, resendInvitation } from "@/lib/actions/users";

interface Invitation {
  id: string;
  email: string;
  role: string;
  status: string;
  token: string;
  expiresAt: Date;
  createdAt: Date;
}

interface InvitationsTableProps {
  invitations: Invitation[];
  isOwner: boolean;
}

export function InvitationsTable({
  invitations,
  isOwner,
}: InvitationsTableProps) {
  const router = useRouter();
  const [revokeTarget, setRevokeTarget] = useState<Invitation | null>(null);

  async function handleRevoke() {
    if (!revokeTarget) return;
    const result = await revokeInvitation(revokeTarget.id);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Invitation revoked");
      router.refresh();
    }
    setRevokeTarget(null);
  }

  async function handleResend(invite: Invitation) {
    const result = await resendInvitation(invite.id);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Invitation resent with new link");
      router.refresh();
    }
  }

  const columns: ColumnDef<Invitation>[] = [
    { accessorKey: "email", header: "Email" },
    {
      accessorKey: "role",
      header: "Role",
      cell: ({ row }) => (
        <Badge variant="outline" className="text-xs">
          {row.original.role}
        </Badge>
      ),
    },
    {
      accessorKey: "createdAt",
      header: "Invited",
      cell: ({ row }) =>
        new Date(row.original.createdAt).toLocaleDateString(),
    },
    {
      accessorKey: "expiresAt",
      header: "Expires",
      cell: ({ row }) => {
        const date = new Date(row.original.expiresAt);
        const isExpired = date < new Date();
        return (
          <span className={isExpired ? "text-destructive" : ""}>
            {isExpired ? "Expired" : date.toLocaleDateString()}
          </span>
        );
      },
    },
    ...(isOwner
      ? [
          {
            id: "actions",
            cell: ({ row }: { row: { original: Invitation } }) => {
              const invite = row.original;
              return (
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={<Button variant="ghost" size="icon" className="h-8 w-8" />}
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleResend(invite)}>
                      Resend
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={() => setRevokeTarget(invite)}
                    >
                      Revoke
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              );
            },
          } as ColumnDef<Invitation>,
        ]
      : []),
  ];

  return (
    <>
      <DataTable columns={columns} data={invitations} />

      <ConfirmDialog
        open={!!revokeTarget}
        onOpenChange={() => setRevokeTarget(null)}
        title="Revoke invitation"
        description={`Are you sure you want to revoke the invitation for ${revokeTarget?.email}?`}
        onConfirm={handleRevoke}
        destructive
      />
    </>
  );
}
