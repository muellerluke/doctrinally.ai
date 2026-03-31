"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { InviteDialog } from "@/components/users/invite-dialog";

export function UserManagementActions({ churchId }: { churchId: string }) {
  const [inviteOpen, setInviteOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setInviteOpen(true)}>Invite user</Button>
      <InviteDialog
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        churchId={churchId}
      />
    </>
  );
}
