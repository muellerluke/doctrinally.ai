import { describe, it, expect, vi } from "vitest";

// Control the LLM classification result per test.
let nextClassification: { existingTopicId: string | null; newTopicLabel: string | null } = {
  existingTopicId: null,
  newTopicLabel: "Baptism",
};
vi.mock("ai", () => ({
  generateObject: vi.fn(async () => ({ object: nextClassification })),
}));
vi.mock("@ai-sdk/openai", () => ({ openai: () => ({}) }));

const { classifyMessageBody } = await import("@/trigger/jobs/classify-message");
const { getTestDb } = await import("../../helpers/db");
const {
  makeOwnerWithChurch,
  makeUser: _makeUser,
} = await import("../../helpers/factories");
const {
  chats,
  messages,
  topics,
} = await import("@/db/schema");

async function seedChatWithUserMessage(
  churchId: string,
  userId: string | null,
  content: string
) {
  const db = getTestDb();
  const [chat] = await db
    .insert(chats)
    .values({ churchId, userId, title: "Test" })
    .returning();
  const [msg] = await db
    .insert(messages)
    .values({
      chatId: chat.id,
      role: "user",
      content,
    })
    .returning();
  return { chatId: chat.id, messageId: msg.id };
}

describe("classifyMessageBody", () => {
  it("creates a new topic when none exists and assigns it to the message", async () => {
    const { church } = await makeOwnerWithChurch();
    const { chatId, messageId } = await seedChatWithUserMessage(
      church.id,
      null,
      "What does the Bible say about baptism?"
    );

    nextClassification = { existingTopicId: null, newTopicLabel: "Baptism" };

    const result = await classifyMessageBody({
      messageId,
      chatId,
      churchId: church.id,
    });
    expect(result).toMatchObject({ success: true, action: "created_new", label: "Baptism" });

    const db = getTestDb();
    const allTopics = await db.query.topics.findMany();
    expect(allTopics).toHaveLength(1);
    expect(allTopics[0].label).toBe("Baptism");
    expect(allTopics[0].embedding?.length).toBe(1536);

    const msg = await db.query.messages.findFirst({
      where: (m, { eq }) => eq(m.id, messageId),
    });
    expect(msg!.topicId).toBe(allTopics[0].id);
  });

  it("reuses an existing topic when the LLM selects one", async () => {
    const { church } = await makeOwnerWithChurch();
    const db = getTestDb();

    // Seed a topic whose embedding matches the query's faked embedding, so
    // findSimilarTopics returns it as a candidate for the LLM.
    const question = "How should I pray in the mornings?";
    const { fakeEmbedding } = await import("../../helpers/msw/handlers");
    const [seededTopic] = await db
      .insert(topics)
      .values({
        churchId: church.id,
        label: "Prayer Life",
        embedding: fakeEmbedding(question),
      })
      .returning();

    const { chatId, messageId } = await seedChatWithUserMessage(
      church.id,
      null,
      question
    );

    nextClassification = { existingTopicId: seededTopic.id, newTopicLabel: null };

    const result = await classifyMessageBody({
      messageId,
      chatId,
      churchId: church.id,
    });
    expect(result).toMatchObject({
      success: true,
      action: "assigned_existing",
      topicId: seededTopic.id,
    });

    const allTopics = await db.query.topics.findMany();
    expect(allTopics).toHaveLength(1); // no new topic created

    const msg = await db.query.messages.findFirst({
      where: (m, { eq }) => eq(m.id, messageId),
    });
    expect(msg!.topicId).toBe(seededTopic.id);
  });

  it("skips if the message is already classified", async () => {
    const { church } = await makeOwnerWithChurch();
    const db = getTestDb();

    const [topic] = await db
      .insert(topics)
      .values({ churchId: church.id, label: "Salvation" })
      .returning();

    const { chatId, messageId } = await seedChatWithUserMessage(
      church.id,
      null,
      "What is salvation?"
    );
    // Pre-assign the topic.
    await db
      .update(messages)
      .set({ topicId: topic.id })
      .where((await import("drizzle-orm")).eq(messages.id, messageId));

    const result = await classifyMessageBody({
      messageId,
      chatId,
      churchId: church.id,
    });
    expect(result).toMatchObject({ skipped: true, reason: "Already classified" });
  });

  it("falls back to 'General' when the LLM returns both nulls", async () => {
    const { church } = await makeOwnerWithChurch();
    const { chatId, messageId } = await seedChatWithUserMessage(
      church.id,
      null,
      "hi"
    );

    nextClassification = { existingTopicId: null, newTopicLabel: null };

    const result = await classifyMessageBody({
      messageId,
      chatId,
      churchId: church.id,
    });
    expect(result).toMatchObject({ success: true, action: "fallback_general" });

    const db = getTestDb();
    const allTopics = await db.query.topics.findMany();
    expect(allTopics.map((t) => t.label)).toContain("General");
  });
});

// Unused imports alias for strict tsc
void _makeUser;
