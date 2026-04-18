/**
 * Programmatic (no-API) token estimation and message-history trimming
 * for the chat route. Heuristic-based — close enough for budgeting, and
 * crucially free of any extra network round-trips.
 */

const TOKENS_PER_WORD = 1.3; // heuristic: ~1.3 tokens per word
const ROLE_OVERHEAD_TOKENS = 3; // "role": "user" / "assistant" message framing
const TOOL_CALL_OVERHEAD_TOKENS = 5; // per tool call / result scaffolding

export interface TokenCountableMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

/**
 * ~1.3 tokens per word. Matches the heuristic used by the document chunker
 * at src/trigger/utils/chunking.ts so both code paths agree.
 */
export function estimateTokens(text: string | null | undefined): number {
  if (!text) return 0;
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  if (words === 0) return 0;
  return Math.ceil(words * TOKENS_PER_WORD);
}

/** Role-framing overhead + content tokens. */
export function estimateMessageTokens(m: TokenCountableMessage): number {
  return ROLE_OVERHEAD_TOKENS + estimateTokens(m.content);
}

export interface TrimOptions {
  /** Tokens consumed by the system prompt. Measure with estimateTokens. */
  systemPromptTokens: number;
  /** Tokens consumed by the RAG context that will be attached to the last user message. */
  ragContextTokens: number;
  /**
   * Tokens consumed by the current (last) user message content — WITHOUT the
   * RAG prefix (that's accounted for separately above). Includes role overhead.
   */
  currentUserTokens: number;
  /** Hard ceiling for total input tokens. Default 100_000. */
  totalBudget?: number;
  /** Tokens reserved for the model's response. Default 4_000. */
  outputReserve?: number;
  /** Per-tool-call scaffolding allowance. Default matches TOOL_CALL_OVERHEAD_TOKENS. */
  toolOverheadTokens?: number;
}

/**
 * Trim older messages (everything except the final user message) so the
 * total input fits inside `totalBudget`. Walks newest-first and keeps
 * messages until adding the next one would exceed the budget.
 *
 * The caller is expected to append the untouched last user message back
 * onto the returned array before sending to the model.
 */
export function trimHistoryToBudget<T extends TokenCountableMessage>(
  olderMessages: T[],
  opts: TrimOptions
): T[] {
  const totalBudget = opts.totalBudget ?? 100_000;
  const outputReserve = opts.outputReserve ?? 4_000;
  const toolOverhead = opts.toolOverheadTokens ?? TOOL_CALL_OVERHEAD_TOKENS;

  const fixed =
    opts.systemPromptTokens +
    opts.ragContextTokens +
    opts.currentUserTokens +
    outputReserve +
    toolOverhead;

  let remaining = totalBudget - fixed;
  if (remaining <= 0) return [];

  const kept: T[] = [];
  for (let i = olderMessages.length - 1; i >= 0; i--) {
    const cost = estimateMessageTokens(olderMessages[i]);
    if (cost > remaining) break;
    remaining -= cost;
    kept.unshift(olderMessages[i]);
  }
  return kept;
}
