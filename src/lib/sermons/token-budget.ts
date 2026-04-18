/**
 * Per-model pricing for the sermon-writer budget meter.
 *
 * Source: https://openai.com/api/pricing — last verified 2026-04-18.
 * A snapshot test in `tests/unit/sermons/token-budget.test.ts` captures these
 * values so any change fails CI and forces an intentional update.
 *
 * Units: cents per 1,000,000 tokens (so a $0.25/M price is `25`).
 */
export const MODEL_PRICING: Record<
  string,
  { inputPer1M: number; outputPer1M: number }
> = {
  "gpt-5.4-mini": { inputPer1M: 25, outputPer1M: 200 },
  // Fallback for environments that set AI_MODEL to a related variant.
  "gpt-5.4": { inputPer1M: 300, outputPer1M: 1500 },
};

export const DEFAULT_MODEL = "gpt-5.4-mini";

/**
 * Price a single model turn in whole cents. Rounds up so a $10 budget is
 * never exceeded by fractional-cent accounting, only by the single final turn
 * whose cost isn't known until `onFinish`.
 */
export function priceTokens(
  model: string,
  inputTokens: number,
  outputTokens: number
): number {
  const pricing = MODEL_PRICING[model] ?? MODEL_PRICING[DEFAULT_MODEL];
  const input = (inputTokens / 1_000_000) * pricing.inputPer1M;
  const output = (outputTokens / 1_000_000) * pricing.outputPer1M;
  return Math.ceil(input + output);
}

/** Format cents as a short USD string, e.g. 312 → "$3.12". */
export function formatCents(cents: number): string {
  const dollars = cents / 100;
  if (Number.isInteger(dollars)) return `$${dollars}`;
  return `$${dollars.toFixed(2)}`;
}
