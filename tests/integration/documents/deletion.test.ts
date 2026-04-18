import { describe, it, expect, beforeEach, vi } from "vitest";
import { getTestDb, resetTestDbData } from "../../helpers/db";
import {
  makeUser,
  makeChurch,
  makeMembership,
  makeDocument,
} from "../../helpers/factories";

let currentSession: { user: { id: string; email: string; name: string } } | null = null;
vi.mock("next-auth", () => ({
  getServerSession: vi.fn(async () => currentSession),
}));

// Run the `after()` callback synchronously so tests can assert on the
// blob-deletion side effect. In prod it runs after the response flushes.
vi.mock("next/server", async () => {
  const actual = await vi.importActual<typeof import("next/server")>(
    "next/server"
  );
  return {
    ...actual,
    after: (fn: () => unknown | Promise<unknown>) => {
      return Promise.resolve(fn()).catch(() => {
        /* swallow — mirrors prod after() behavior */
      });
    },
  };
});

const delMock = vi.fn(async () => {});
vi.mock("@vercel/blob", () => ({
  del: delMock,
}));

vi.mock("@trigger.dev/sdk/v3", () => ({
  tasks: { trigger: vi.fn(async () => ({})) },
}));

let activeMembership: { membership: { churchId: string; role: string } } | null = null;
vi.mock("@/lib/active-church", () => ({
  getActiveMembershipForUser: vi.fn(async () => activeMembership),
}));

const { deleteDocument } = await import("@/lib/actions/documents");
const { deleteFolder } = await import("@/lib/actions/folders");
const { folders, documents } = await import("@/db/schema");

describe("deleteDocument — blob cleanup", () => {
  beforeEach(async () => {
    await resetTestDbData();
    vi.clearAllMocks();
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

  it("deletes the row and schedules the blob for deletion", async () => {
    const { church } = await arrangeAuthedChurch();
    const doc = await makeDocument(church.id, {
      blobPath: "https://blob.test/files/a.pdf",
    });

    const result = await deleteDocument(doc.id);
    expect(result).toEqual({ success: true });

    // Let the mocked after() microtask complete.
    await Promise.resolve();
    await Promise.resolve();

    expect(delMock).toHaveBeenCalledWith("https://blob.test/files/a.pdf");

    const db = getTestDb();
    const remaining = await db.query.documents.findFirst({
      where: (d, { eq }) => eq(d.id, doc.id),
    });
    expect(remaining).toBeUndefined();
  });

  it("skips blob cleanup when the document has no blobPath (e.g. youtube)", async () => {
    const { church } = await arrangeAuthedChurch();
    const doc = await makeDocument(church.id, {
      type: "youtube",
      blobPath: null,
      sourceUrl: "https://youtube.com/watch?v=xyz",
    });

    const result = await deleteDocument(doc.id);
    expect(result).toEqual({ success: true });

    await Promise.resolve();
    expect(delMock).not.toHaveBeenCalled();
  });
});

describe("deleteFolder — recursive doc + blob cleanup", () => {
  beforeEach(async () => {
    await resetTestDbData();
    vi.clearAllMocks();
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

  async function makeFolder(
    churchId: string,
    name: string,
    parentId: string | null = null
  ): Promise<string> {
    const db = getTestDb();
    const [row] = await db
      .insert(folders)
      .values({ churchId, name, parentId })
      .returning({ id: folders.id });
    return row.id;
  }

  it("deletes documents directly inside the folder and schedules their blobs", async () => {
    const { church } = await arrangeAuthedChurch();
    const folderId = await makeFolder(church.id, "Sermons 2026");
    const docA = await makeDocument(church.id, {
      folderId,
      blobPath: "https://blob.test/files/a.pdf",
    });
    const docB = await makeDocument(church.id, {
      folderId,
      blobPath: "https://blob.test/files/b.pdf",
    });

    const result = await deleteFolder(folderId);
    expect(result).toMatchObject({
      success: true,
      deletedFolders: 1,
      deletedDocuments: 2,
    });

    await Promise.resolve();
    await Promise.resolve();

    expect(delMock).toHaveBeenCalledTimes(2);
    expect(delMock).toHaveBeenCalledWith("https://blob.test/files/a.pdf");
    expect(delMock).toHaveBeenCalledWith("https://blob.test/files/b.pdf");

    const db = getTestDb();
    expect(
      await db.query.documents.findFirst({
        where: (d, { eq }) => eq(d.id, docA.id),
      })
    ).toBeUndefined();
    expect(
      await db.query.documents.findFirst({
        where: (d, { eq }) => eq(d.id, docB.id),
      })
    ).toBeUndefined();
    expect(
      await db.query.folders.findFirst({
        where: (f, { eq }) => eq(f.id, folderId),
      })
    ).toBeUndefined();
  });

  it("recursively deletes nested folders and all their documents", async () => {
    const { church } = await arrangeAuthedChurch();
    const top = await makeFolder(church.id, "Top");
    const mid = await makeFolder(church.id, "Mid", top);
    const leaf = await makeFolder(church.id, "Leaf", mid);

    const topDoc = await makeDocument(church.id, {
      folderId: top,
      blobPath: "https://blob.test/top.pdf",
    });
    const midDoc = await makeDocument(church.id, {
      folderId: mid,
      blobPath: "https://blob.test/mid.pdf",
    });
    const leafDoc = await makeDocument(church.id, {
      folderId: leaf,
      blobPath: "https://blob.test/leaf.pdf",
    });

    const result = await deleteFolder(top);
    expect(result).toMatchObject({
      success: true,
      deletedFolders: 3,
      deletedDocuments: 3,
    });

    await Promise.resolve();
    await Promise.resolve();

    expect(delMock).toHaveBeenCalledTimes(3);

    const db = getTestDb();
    for (const id of [topDoc.id, midDoc.id, leafDoc.id]) {
      expect(
        await db.query.documents.findFirst({
          where: (d, { eq }) => eq(d.id, id),
        })
      ).toBeUndefined();
    }
    for (const id of [top, mid, leaf]) {
      expect(
        await db.query.folders.findFirst({
          where: (f, { eq }) => eq(f.id, id),
        })
      ).toBeUndefined();
    }
  });

  it("does not schedule blob deletion for documents without a blobPath", async () => {
    const { church } = await arrangeAuthedChurch();
    const folderId = await makeFolder(church.id, "Misc");
    await makeDocument(church.id, {
      folderId,
      type: "youtube",
      blobPath: null,
      sourceUrl: "https://youtube.com/watch?v=xyz",
    });
    await makeDocument(church.id, {
      folderId,
      type: "platejs",
      blobPath: null,
      content: "# Written in-app",
    });

    const result = await deleteFolder(folderId);
    expect(result).toMatchObject({
      success: true,
      deletedDocuments: 2,
    });

    await Promise.resolve();
    expect(delMock).not.toHaveBeenCalled();
  });

  it("does not touch documents or folders in other churches", async () => {
    const a = await arrangeAuthedChurch();
    const bChurch = await makeChurch();
    const bFolderId = await makeFolder(bChurch.id, "Other Church");
    const bDoc = await makeDocument(bChurch.id, {
      folderId: bFolderId,
      blobPath: "https://blob.test/other.pdf",
    });

    const myFolderId = await makeFolder(a.church.id, "Mine");
    await makeDocument(a.church.id, {
      folderId: myFolderId,
      blobPath: "https://blob.test/mine.pdf",
    });

    // Attempt to delete the other church's folder — should be rejected.
    const bad = await deleteFolder(bFolderId);
    expect(bad).toEqual({ error: "Folder not found" });

    const db = getTestDb();
    expect(
      await db.query.folders.findFirst({
        where: (f, { eq }) => eq(f.id, bFolderId),
      })
    ).toBeDefined();
    expect(
      await db.query.documents.findFirst({
        where: (d, { eq }) => eq(d.id, bDoc.id),
      })
    ).toBeDefined();
    expect(delMock).not.toHaveBeenCalled();
  });
});
