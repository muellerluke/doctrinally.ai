import { describe, it, expect, vi } from "vitest";
import { getTestDb } from "../../helpers/db";
import {
  makeUser,
  makeChurch,
  makeMembership,
} from "../../helpers/factories";

// We stub session + active membership per-test so we can exercise both the
// invite action (needs owner session) and the accept action (needs invitee
// session).
let session: { user: { id: string; email: string; name: string } } | null = null;
let activeMembership: { membership: { churchId: string; role: string } } | null = null;

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(async () => session),
}));
vi.mock("@/lib/active-church", () => ({
  getActiveMembershipForUser: vi.fn(async () => activeMembership),
  setActiveChurchCookie: vi.fn(),
  ACTIVE_CHURCH_COOKIE: "doctrinally-active-church",
}));

const { inviteUser } = await import("@/lib/actions/users");
const { acceptInvitation } = await import("@/lib/actions/auth");
const { sendInvitationEmail } = await import("@/lib/email");

describe("Invitation flow (owner invites → invitee accepts)", () => {
  it("creates a pending invitation, emails the link, then invitee accepts and becomes a member", async () => {
    const db = getTestDb();
    const owner = await makeUser({ email: "owner@church.test" });
    const church = await makeChurch();
    await makeMembership(owner.id, church.id, "owner");

    session = {
      user: { id: owner.id, email: owner.email, name: owner.name },
    };
    activeMembership = {
      membership: { churchId: church.id, role: "owner" },
    };

    // ── Owner invites ────────────────────────────────────────────────
    const inviteResult = await inviteUser({
      churchId: church.id,
      email: "newbie@church.test",
    });
    expect(inviteResult).toEqual({ success: true });

    expect(sendInvitationEmail).toHaveBeenCalledWith(
      "newbie@church.test",
      expect.any(String),
      "admin",
      expect.stringContaining("/invite?token=")
    );

    // Pending invite row lives in the DB.
    const invite = await db.query.invitations.findFirst({
      where: (i, { eq }) => eq(i.email, "newbie@church.test"),
    });
    expect(invite).toBeDefined();
    expect(invite!.status).toBe("pending");
    expect(invite!.token).toBeTruthy();

    // ── Invitee signs up and accepts ────────────────────────────────
    const invitee = await makeUser({ email: "newbie@church.test" });
    const acceptResult = await acceptInvitation(invite!.token, invitee.id);
    expect(acceptResult).toMatchObject({ success: true, churchId: church.id });

    // Membership row created with role from invite (admin).
    const newMembership = await db.query.memberships.findFirst({
      where: (m, { eq, and }) =>
        and(eq(m.userId, invitee.id), eq(m.churchId, church.id)),
    });
    expect(newMembership).toBeDefined();
    expect(newMembership!.role).toBe("admin");

    // Invitation marked accepted.
    const accepted = await db.query.invitations.findFirst({
      where: (i, { eq }) => eq(i.id, invite!.id),
    });
    expect(accepted!.status).toBe("accepted");
  });

  it("blocks non-owners from inviting", async () => {
    const admin = await makeUser();
    const church = await makeChurch();
    await makeMembership(admin.id, church.id, "admin");

    session = {
      user: { id: admin.id, email: admin.email, name: admin.name },
    };
    activeMembership = {
      membership: { churchId: church.id, role: "admin" },
    };

    const result = await inviteUser({
      churchId: church.id,
      email: "someone@church.test",
    });
    expect(result).toEqual({ error: "Only owners can invite users" });
  });

  it("rejects a duplicate pending invitation for the same email", async () => {
    const owner = await makeUser();
    const church = await makeChurch();
    await makeMembership(owner.id, church.id, "owner");

    session = {
      user: { id: owner.id, email: owner.email, name: owner.name },
    };
    activeMembership = {
      membership: { churchId: church.id, role: "owner" },
    };

    await inviteUser({ churchId: church.id, email: "dup@church.test" });
    const second = await inviteUser({
      churchId: church.id,
      email: "dup@church.test",
    });
    expect(second).toEqual({
      error: "An invitation is already pending for this email",
    });
  });

  it("rejects an expired invitation", async () => {
    const db = getTestDb();
    const invitee = await makeUser();
    const owner = await makeUser();
    const church = await makeChurch();
    await makeMembership(owner.id, church.id, "owner");

    // Insert an already-expired invitation directly.
    const [expired] = await db
      .insert((await import("@/db/schema")).invitations)
      .values({
        churchId: church.id,
        invitedBy: owner.id,
        email: invitee.email,
        role: "admin",
        token: "expired-token",
        expiresAt: new Date(Date.now() - 86_400_000), // 1 day ago
        status: "pending",
      })
      .returning();

    const result = await acceptInvitation(expired.token, invitee.id);
    expect("error" in result).toBe(true);
  });
});
