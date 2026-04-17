/**
 * Extract a useful error message from an unknown error, including Postgres
 * error details when present (code, detail, constraint, table, column).
 *
 * postgres.js wraps server errors with SQLSTATE `code` and related fields.
 * Drizzle rethrows these with the original error attached as `cause`.
 * This walks the `cause` chain to find the underlying PG error.
 */

type PgLikeError = {
  code?: string;
  detail?: string;
  hint?: string;
  table_name?: string;
  column_name?: string;
  constraint_name?: string;
  schema_name?: string;
  routine?: string;
  message?: string;
};

function findPgError(error: unknown): PgLikeError | null {
  let current: unknown = error;
  for (let depth = 0; depth < 5 && current; depth++) {
    if (typeof current === "object" && current !== null) {
      const e = current as PgLikeError & { cause?: unknown };
      if (typeof e.code === "string" && /^[0-9A-Z]{5}$/.test(e.code)) {
        return e;
      }
      current = e.cause;
    } else {
      break;
    }
  }
  return null;
}

/**
 * Build a short, human-readable message for storage in `documents.error_message`.
 * Avoids the giant Drizzle "Failed query: ..." SQL dump and instead surfaces
 * the actual Postgres error code and detail.
 */
export function formatProcessingError(error: unknown): string {
  const pg = findPgError(error);
  if (pg) {
    const parts: string[] = [];
    if (pg.code) parts.push(`[${pg.code}]`);
    if (pg.message) parts.push(pg.message);
    if (pg.detail) parts.push(`detail: ${pg.detail}`);
    if (pg.constraint_name) parts.push(`constraint: ${pg.constraint_name}`);
    if (pg.table_name) parts.push(`table: ${pg.table_name}`);
    if (pg.column_name) parts.push(`column: ${pg.column_name}`);
    if (pg.hint) parts.push(`hint: ${pg.hint}`);
    return parts.join(" ");
  }
  if (error instanceof Error) return error.message;
  return "Unknown error occurred";
}

/**
 * Log the full error to stderr for Trigger.dev logs, including any PG fields
 * and the cause chain. Keep this verbose — it only runs on failure.
 */
export function logProcessingError(context: string, error: unknown): void {
  const pg = findPgError(error);
  console.error(`[${context}] processing failed`, {
    message: error instanceof Error ? error.message : String(error),
    pg: pg
      ? {
          code: pg.code,
          detail: pg.detail,
          hint: pg.hint,
          constraint: pg.constraint_name,
          table: pg.table_name,
          column: pg.column_name,
          schema: pg.schema_name,
          routine: pg.routine,
        }
      : null,
    stack: error instanceof Error ? error.stack : undefined,
  });
}
