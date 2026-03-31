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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { changeUserRole, removeUser } from "@/lib/actions/users";

interface Member {
  membershipId: string;
  userId: string;
  name: string;
  email: string;
  role: string;
  joinedAt: Date;
}

interface MembersTableProps {
  members: Member[];
  isOwner: boolean;
  currentUserId: string;
}

export function MembersTable({
  members,
  isOwner,
  currentUserId,
}: MembersTableProps) {
  const router = useRouter();
  const [roleTarget, setRoleTarget] = useState<Member | null>(null);
  const [newRole, setNewRole] = useState<string>("");
  const [removeTarget, setRemoveTarget] = useState<Member | null>(null);

  async function handleRoleChange() {
    if (!roleTarget || !newRole) return;
    const result = await changeUserRole({
      membershipId: roleTarget.membershipId,
      role: newRole as "admin" | "member" | "owner",
    });
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Role updated");
      router.refresh();
    }
    setRoleTarget(null);
  }

  async function handleRemove() {
    if (!removeTarget) return;
    const result = await removeUser(removeTarget.membershipId);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("User removed");
      router.refresh();
    }
    setRemoveTarget(null);
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
      cell: ({ row }) =>
        new Date(row.original.joinedAt).toLocaleDateString(),
    },
    ...(isOwner
      ? [
          {
            id: "actions",
            cell: ({ row }: { row: { original: Member } }) => {
              const member = row.original;
              const isSelf = member.userId === currentUserId;
              if (isSelf) return null;

              return (
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={<Button variant="ghost" size="icon" className="h-8 w-8" />}
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => {
                        setRoleTarget(member);
                        setNewRole(member.role);
                      }}
                    >
                      Change role
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={() => setRemoveTarget(member)}
                    >
                      Remove
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              );
            },
          } as ColumnDef<Member>,
        ]
      : []),
  ];

  return (
    <>
      <DataTable columns={columns} data={members} />

      {/* Change role dialog */}
      <Dialog open={!!roleTarget} onOpenChange={() => setRoleTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Change role</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Change the role for{" "}
            <span className="font-medium text-foreground">
              {roleTarget?.name}
            </span>
          </p>
          <Select value={newRole} onValueChange={(v) => v && setNewRole(v)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="member">Member</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="owner">Owner</SelectItem>
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRoleTarget(null)}>
              Cancel
            </Button>
            <Button onClick={handleRoleChange}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove confirm */}
      <ConfirmDialog
        open={!!removeTarget}
        onOpenChange={() => setRemoveTarget(null)}
        title="Remove user"
        description={`Are you sure you want to remove ${removeTarget?.name} from the church? They will lose access.`}
        onConfirm={handleRemove}
        destructive
      />
    </>
  );
}
