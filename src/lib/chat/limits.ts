/**
 * Character limit applied to a single user message in the member-facing
 * chat and the embedded widget chat. Enforced both client-side (to give
 * the visitor immediate feedback via the counter) and server-side (to
 * stop a tampered client from spending tokens on a 50k-char prompt).
 *
 * Admin and sermon-writer surfaces intentionally skip this gate — those
 * are power-user flows where longer prompts are legitimately useful.
 */
export const MAX_USER_MESSAGE_CHARS = 1000;

/**
 * Narrow helper so both chat routes reject over-limit messages with the
 * same error shape. Returns an error string if the check failed, or
 * `null` on pass.
 */
export function validateUserMessageLength(content: string): string | null {
  if (typeof content !== "string") return "Message must be a string";
  if (content.length > MAX_USER_MESSAGE_CHARS) {
    return `Message exceeds the ${MAX_USER_MESSAGE_CHARS}-character limit`;
  }
  return null;
}
