import { describe, it, expect, beforeEach, vi } from "vitest";
import { getTestDb, resetTestDbData } from "../../helpers/db";
import {
  makeUser,
  makeChurch,
  makeMembership,
  makeDocument,
} from "../../helpers/factories";
import { mockTasksTrigger } from "../../helpers/mocks";

let currentSession: { user: { id: string; email: string; name: string } } | null = null;
vi.mock("next-auth", () => ({
  getServerSession: vi.fn(async () => currentSession),
}));

vi.mock("@trigger.dev/sdk/v3", () => ({
  tasks: { trigger: mockTasksTrigger },
}));

vi.mock("@vercel/blob", () => ({
  del: vi.fn(),
}));

// Stub getActiveMembershipForUser so tests don't depend on cookie plumbing.
let activeMembership: { membership: { churchId: string; role: string } } | null = null;
vi.mock("@/lib/active-church", () => ({
  getActiveMembershipForUser: vi.fn(async () => activeMembership),
}));

const { confirmBlobUpload } = await import("@/lib/actions/documents");

describe("confirmBlobUpload", () => {
  beforeEach(async () => {
    await resetTestDbData();
    vi.clearAllMocks();
    currentSession = null;
    activeMembership = null;
  });

  async function arrangeUploadedDoc(uploadId: string) {
    const user = await makeUser();
    const church = await makeChurch();
    await makeMembership(user.id, church.id, "owner");
    const doc = await makeDocument(church.id, {
      type: "pdf",
      status: "uploaded",
      metadata: { uploadId },
    });
    currentSession = {
      user: { id: user.id, email: user.email, name: user.name },
    };
    activeMembership = { membership: { churchId: church.id, role: "owner" } };
    return { user, church, doc };
  }

  it("updates blobPath, flips to queued, and fires the processing task", async () => {
    const { doc } = await arrangeUploadedDoc("upl_A");

    const result = await confirmBlobUpload(
      "upl_A",
      "https://blob.test/files/a.pdf"
    );
    expect(result).toEqual({ success: true });

    const db = getTestDb();
    const updated = await db.query.documents.findFirst({
      where: (d, { eq }) => eq(d.id, doc.id),
    });
    expect(updated!.status).toBe("queued");
    expect(updated!.blobPath).toBe("https://blob.test/files/a.pdf");

    expect(mockTasksTrigger).toHaveBeenCalledWith(
      "process-pdf",
      { documentId: doc.id }
    );
  });

  it("is a no-op when the webhook already advanced the doc past uploaded", async () => {
    const { doc } = await arrangeUploadedDoc("upl_B");
    const db = getTestDb();

    // Simulate webhook arriving first.
    await db.execute(
      (await import("drizzle-orm")).sql`
        UPDATE documents
        SET status = 'queued', blob_path = 'https://blob.test/webhook-first.pdf'
        WHERE id = ${doc.id}
      `
    );

    const result = await confirmBlobUpload(
      "upl_B",
      "https://blob.test/client-second.pdf"
    );
    expect(result).toEqual({ success: true, alreadyHandled: true });

    const after = await db.query.documents.findFirst({
      where: (d, { eq }) => eq(d.id, doc.id),
    });
    // Webhook URL wins; trigger is NOT fired a second time.
    expect(after!.blobPath).toBe("https://blob.test/webhook-first.pdf");
    expect(mockTasksTrigger).not.toHaveBeenCalled();
  });

  it("rejects unauthenticated callers", async () => {
    currentSession = null;
    const result = await confirmBlobUpload("upl_X", "https://blob.test/x.pdf");
    expect(result).toEqual({ error: "Unauthorized" });
  });

  it("rejects missing params", async () => {
    const { user, church } = await arrangeUploadedDoc("upl_C");
    void user;
    void church;

    expect(await confirmBlobUpload("", "https://blob.test/x.pdf")).toEqual({
      error: "Missing uploadId or blobUrl",
    });
    expect(await confirmBlobUpload("upl_C", "")).toEqual({
      error: "Missing uploadId or blobUrl",
    });
  });

  it("returns a clear error when uploadId doesn't match any doc in the church", async () => {
    await arrangeUploadedDoc("upl_D");

    const result = await confirmBlobUpload(
      "upl_doesnt-exist",
      "https://blob.test/ghost.pdf"
    );
    expect(result).toEqual({ error: "Document not found for this upload" });
    expect(mockTasksTrigger).not.toHaveBeenCalled();
  });
});
