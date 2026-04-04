import { generateObject } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { topics, messages } from "@/db/schema";
import { generateEmbeddings } from "./embeddings";

// Fixed system prompt — identical every call for prompt caching
const CLASSIFICATION_SYSTEM_PROMPT = `You are a topic classifier for a church AI assistant. Given a user's question and a list of existing topics, determine which topic best fits the question. If none of the existing topics fit well, suggest a new short topic label.

Rules:
- Topic labels should be short phrases (2-4 words max)
- Topics should be general enough to group multiple questions
- Examples of good topics: "Baptism", "Prayer Life", "Marriage & Family", "Book of Romans", "Church History", "Tithing & Giving", "Salvation", "End Times", "Parenting", "Grief & Loss", "Worship", "Volunteering"
- If the question is casual greetings with no clear topic, use "General"
- IMPORTANT: Do not create topics that are very similar to existing ones. If an existing topic covers the same subject, use it even if the wording isn't a perfect match. For example, use "Baptism" instead of creating "Getting Baptized" or "Baptism Questions".
- If you pick an existing topic, set existingTopicId to its id and leave newTopicLabel null
- If you need a new topic, set newTopicLabel to the label and leave existingTopicId null`;

export interface CandidateTopic {
  id: string;
  label: string;
  similarity: number;
}

/**
 * Find the most semantically similar topics for a given embedding.
 */
export async function findSimilarTopics(
  churchId: string,
  embedding: number[],
  limit = 5,
  threshold = 0.25
): Promise<CandidateTopic[]> {
  const vectorStr = `[${embedding.join(",")}]`;

  const rows = await db.execute(sql`
    SELECT
      id,
      label,
      1 - (embedding <=> ${vectorStr}::vector) AS similarity
    FROM topics
    WHERE church_id = ${churchId}
      AND embedding IS NOT NULL
    ORDER BY embedding <=> ${vectorStr}::vector
    LIMIT ${limit}
  `);

  return (
    rows as unknown as { id: string; label: string; similarity: number }[]
  ).filter((r) => r.similarity >= threshold);
}

/**
 * Enrich a user message with context so follow-up questions can be classified.
 * "Tell me more about that" → prepend previous assistant response for meaning.
 */
export function enrichMessageForClassification(
  userMessage: string,
  previousMessages: { role: string; content: string }[]
): string {
  const followUpPatterns =
    /^(tell me more|can you explain|what about|how about|yes|no|thanks|ok|continue|go on|elaborate|why|how so|really)/i;

  if (
    !followUpPatterns.test(userMessage.trim()) &&
    userMessage.length > 30
  ) {
    return userMessage;
  }

  // Prepend context from the last assistant response
  const lastAssistant = [...previousMessages]
    .reverse()
    .find((m) => m.role === "assistant");

  if (lastAssistant) {
    return `Context: ${lastAssistant.content.slice(0, 200)}\n\nUser question: ${userMessage}`;
  }

  return userMessage;
}

/**
 * Use LLM to classify a question into an existing or new topic.
 */
export async function classifyQuestion(
  enrichedQuestion: string,
  candidateTopics: CandidateTopic[]
): Promise<{ existingTopicId: string | null; newTopicLabel: string | null }> {
  const topicsList =
    candidateTopics.length > 0
      ? candidateTopics
          .map(
            (t) =>
              `- id: "${t.id}" label: "${t.label}" (similarity: ${t.similarity.toFixed(2)})`
          )
          .join("\n")
      : "No existing topics yet.";

  const result = await generateObject({
    model: openai("gpt-5.4-nano"),
    system: CLASSIFICATION_SYSTEM_PROMPT,
    prompt: `Question:\n${enrichedQuestion}\n\nExisting topics:\n${topicsList}\n\nClassify this question.`,
    schema: z.object({
      existingTopicId: z
        .string()
        .nullable()
        .describe(
          "The id of the best matching existing topic, or null if a new topic is needed"
        ),
      newTopicLabel: z
        .string()
        .nullable()
        .describe(
          "A new short topic label (2-4 words) if no existing topic fits, or null"
        ),
    }),
  });

  return result.object;
}

/**
 * Create a new topic with an embedding.
 * Uses onConflictDoUpdate to handle race conditions gracefully.
 */
export async function createTopic(
  churchId: string,
  label: string,
  embedding: number[]
): Promise<string> {
  const [topic] = await db
    .insert(topics)
    .values({
      churchId,
      label,
      embedding,
    })
    .onConflictDoNothing({
      target: [topics.churchId, topics.label],
    })
    .returning({ id: topics.id });

  // If conflict (topic already exists), fetch the existing one
  if (!topic) {
    const [existing] = await db
      .select({ id: topics.id })
      .from(topics)
      .where(
        sql`${topics.churchId} = ${churchId} AND ${topics.label} = ${label}`
      )
      .limit(1);
    return existing.id;
  }

  return topic.id;
}

/**
 * Assign a topic to a user message.
 */
export async function assignTopicToMessage(
  messageId: string,
  topicId: string
): Promise<void> {
  await db
    .update(messages)
    .set({ topicId })
    .where(eq(messages.id, messageId));
}
