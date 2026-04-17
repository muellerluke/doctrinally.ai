import { task } from "@trigger.dev/sdk/v3";
import { eq, desc, and, lt } from "drizzle-orm";
import { db } from "@/db";
import { messages } from "@/db/schema";
import { generateEmbeddings } from "../utils/embeddings";
import {
  findSimilarTopics,
  enrichMessageForClassification,
  classifyQuestion,
  createTopic,
  assignTopicToMessage,
} from "../utils/classification";

export async function classifyMessageBody(payload: {
  messageId: string;
  chatId: string;
  churchId: string;
}) {
  const { messageId, chatId, churchId } = payload;

  try {
    const [userMessage] = await db
      .select({
        id: messages.id,
        content: messages.content,
        topicId: messages.topicId,
      })
      .from(messages)
      .where(eq(messages.id, messageId))
      .limit(1);

    if (!userMessage) return { skipped: true, reason: "Message not found" };
    if (userMessage.topicId)
      return { skipped: true, reason: "Already classified" };

    const previousMessages = await db
      .select({ role: messages.role, content: messages.content })
      .from(messages)
      .where(and(eq(messages.chatId, chatId), lt(messages.id, messageId)))
      .orderBy(desc(messages.createdAt))
      .limit(2);

    previousMessages.reverse();

    const enrichedQuery = enrichMessageForClassification(
      userMessage.content,
      previousMessages
    );

    const [embedding] = await generateEmbeddings([enrichedQuery]);
    const candidates = await findSimilarTopics(churchId, embedding);
    const classification = await classifyQuestion(enrichedQuery, candidates);

    if (classification.existingTopicId) {
      const validCandidate = candidates.find(
        (c) => c.id === classification.existingTopicId
      );
      if (validCandidate) {
        await assignTopicToMessage(messageId, validCandidate.id);
        return {
          success: true,
          action: "assigned_existing",
          topicId: validCandidate.id,
          label: validCandidate.label,
        };
      }
    }

    if (classification.newTopicLabel) {
      const label = classification.newTopicLabel.slice(0, 50);
      const topicId = await createTopic(churchId, label, embedding);
      await assignTopicToMessage(messageId, topicId);
      return {
        success: true,
        action: "created_new",
        topicId,
        label,
      };
    }

    const topicId = await createTopic(churchId, "General", embedding);
    await assignTopicToMessage(messageId, topicId);
    return { success: true, action: "fallback_general", topicId };
  } catch (error) {
    console.error("classify-message failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export const classifyMessage = task({
  id: "classify-message",
  machine: "micro", // 0.25 vCPU / 256 MB — lightweight LLM call + embedding
  retry: { maxAttempts: 2 },
  run: classifyMessageBody,
});
