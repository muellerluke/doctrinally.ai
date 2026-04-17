import { describe, it, expect, beforeEach, vi } from "vitest";
import { getTestDb, resetTestDbData } from "../../helpers/db";
import { makeUser, makeChurch, makeMembership } from "../../helpers/factories";
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

let activeMembership: { membership: { churchId: string; role: string } } | null = null;
vi.mock("@/lib/active-church", () => ({
  getActiveMembershipForUser: vi.fn(async () => activeMembership),
}));

const { confirmBlobUpload, upsertUploadedDocument } = await import(
  "@/lib/actions/documents"
);

describe("upsertUploadedDocument (shared helper used by webhook + client)", () => {
  beforeEach(async () => {
    await resetTestDbData();
    vi.clearAllMocks();
  });

  async function arrangeChurch() {
    const user = await makeUser();
    const church = await makeChurch();
    await makeMembership(user.id, church.id, "owner");
    return { user, church };
  }

  it("inserts a queued document with blobPath + metadata and triggers processing", async () => {
    const { user, church } = await arrangeChurch();

    const result = await upsertUploadedDocument({
      churchId: church.id,
      uploadedBy: user.id,
      title: "Sermon on the Mount",
      docType: "pdf",
      folderId: null,
      tags: ["jesus", "teaching"],
      uploadId: "upl_A",
      blobPath: "https://blob.test/files/a.pdf",
    });
    expect(result.alreadyExisted).toBe(false);

    const db = getTestDb();
    const inserted = await db.query.documents.findFirst({
      where: (d, { eq }) => eq(d.id, result.id),
    });
    expect(inserted!.status).toBe("queued");
    expect(inserted!.blobPath).toBe("https://blob.test/files/a.pdf");
    expect(inserted!.title).toBe("Sermon on the Mount");
    expect(inserted!.type).toBe("pdf");
    expect(inserted!.metadata).toMatchObject({
      uploadId: "upl_A",
      tags: ["jesus", "teaching"],
    });

    expect(mockTasksTrigger).toHaveBeenCalledWith("process-pdf", {
      documentId: result.id,
    });
  });

  it("is idempotent via uploadId — second call returns existing id and does not re-trigger", async () => {
    const { user, church } = await arrangeChurch();

    const first = await upsertUploadedDocument({
      churchId: church.id,
      uploadedBy: user.id,
      title: "doc",
      docType: "pdf",
      folderId: null,
      tags: [],
      uploadId: "upl_dup",
      blobPath: "https://blob.test/1.pdf",
    });
    expect(first.alreadyExisted).toBe(false);

    const second = await upsertUploadedDocument({
      churchId: church.id,
      uploadedBy: user.id,
      title: "doc",
      docType: "pdf",
      folderId: null,
      tags: [],
      uploadId: "upl_dup",
      blobPath: "https://blob.test/2.pdf",
    });
    expect(second.alreadyExisted).toBe(true);
    expect(second.id).toBe(first.id);

    const db = getTestDb();
    const all = await db.query.documents.findMany({
      where: (d, { eq }) => eq(d.id, first.id),
    });
    expect(all).toHaveLength(1);
    expect(all[0].blobPath).toBe("https://blob.test/1.pdf");

    expect(mockTasksTrigger).toHaveBeenCalledTimes(1);
  });

  it("scopes idempotency per-church — same uploadId across churches inserts two rows", async () => {
    const a = await arrangeChurch();
    const b = await arrangeChurch();

    const inA = await upsertUploadedDocument({
      churchId: a.church.id,
      uploadedBy: a.user.id,
      title: "A",
      docType: "pdf",
      folderId: null,
      tags: [],
      uploadId: "upl_cross",
      blobPath: "https://blob.test/a.pdf",
    });

    const inB = await upsertUploadedDocument({
      churchId: b.church.id,
      uploadedBy: b.user.id,
      title: "B",
      docType: "pdf",
      folderId: null,
      tags: [],
      uploadId: "upl_cross",
      blobPath: "https://blob.test/b.pdf",
    });

    expect(inA.alreadyExisted).toBe(false);
    expect(inB.alreadyExisted).toBe(false);
    expect(inA.id).not.toBe(inB.id);
    expect(mockTasksTrigger).toHaveBeenCalledTimes(2);
  });
});

describe("confirmBlobUpload (client-side fallback)", () => {
  beforeEach(async () => {
    await resetTestDbData();
    vi.clearAllMocks();
    currentSession = null;
    activeMembership = null;
  });

  async function arrangeAuthedChurch() {
    const user = await makeUser();
    const church = await makeChurch();
    await makeMembership(user.id, church.id, "owner");
    currentSession = {
      user: { id: user.id, email: user.email, name: user.name },
    };
    activeMembership = { membership: { churchId: church.id, role: "owner" } };
    return { user, church };
  }

  it("inserts the row with queued status when no row exists yet", async () => {
    const { church } = await arrangeAuthedChurch();

    const result = await confirmBlobUpload({
      uploadId: "upl_first-time",
      blobUrl: "https://blob.test/first.pdf",
      title: "First Upload",
      tags: ["new"],
      folderId: null,
      docType: "pdf",
    });

    expect(result.success).toBe(true);
    expect(result.alreadyHandled).toBe(false);
    expect(result.documentId).toBeTruthy();

    const db = getTestDb();
    const row = await db.query.documents.findFirst({
      where: (d, { eq }) => eq(d.id, result.documentId!),
    });
    expect(row!.churchId).toBe(church.id);
    expect(row!.status).toBe("queued");
    expect(row!.blobPath).toBe("https://blob.test/first.pdf");

    expect(mockTasksTrigger).toHaveBeenCalledWith("process-pdf", {
      documentId: result.documentId,
    });
  });

  it("is a no-op when the webhook already inserted the row", async () => {
    const { user, church } = await arrangeAuthedChurch();

    // Simulate webhook landing first.
    const first = await upsertUploadedDocument({
      churchId: church.id,
      uploadedBy: user.id,
      title: "Webhook First",
      docType: "pdf",
      folderId: null,
      tags: [],
      uploadId: "upl_race",
      blobPath: "https://blob.test/webhook.pdf",
    });
    vi.clearAllMocks();

    const result = await confirmBlobUpload({
      uploadId: "upl_race",
      blobUrl: "https://blob.test/client.pdf",
      title: "Webhook First",
      tags: [],
      folderId: null,
      docType: "pdf",
    });

    expect(result.success).toBe(true);
    expect(result.alreadyHandled).toBe(true);
    expect(result.documentId).toBe(first.id);

    const db = getTestDb();
    const row = await db.query.documents.findFirst({
      where: (d, { eq }) => eq(d.id, first.id),
    });
    // Webhook URL wins; trigger not fired a second time.
    expect(row!.blobPath).toBe("https://blob.test/webhook.pdf");
    expect(mockTasksTrigger).not.toHaveBeenCalled();
  });

  it("rejects unauthenticated callers", async () => {
    currentSession = null;

    const result = await confirmBlobUpload({
      uploadId: "upl_x",
      blobUrl: "https://blob.test/x.pdf",
      title: "X",
      tags: [],
      folderId: null,
      docType: "pdf",
    });

    expect(result).toEqual({ error: "Unauthorized" });
  });

  it("rejects missing uploadId or blobUrl", async () => {
    await arrangeAuthedChurch();

    expect(
      await confirmBlobUpload({
        uploadId: "",
        blobUrl: "https://blob.test/x.pdf",
        title: "X",
        tags: [],
        folderId: null,
        docType: "pdf",
      })
    ).toEqual({ error: "Missing uploadId or blobUrl" });

    expect(
      await confirmBlobUpload({
        uploadId: "upl_Y",
        blobUrl: "",
        title: "Y",
        tags: [],
        folderId: null,
        docType: "pdf",
      })
    ).toEqual({ error: "Missing uploadId or blobUrl" });
  });
});
