/**
 * Platform super-admin identity. Lives in its own module to avoid
 * circular imports between `auth-guards.ts` (which uses session-based
 * guards) and `active-church.ts` (which consults the super-admin flag
 * to grant cross-church impersonation).
 */

export const SUPER_ADMIN_EMAIL = "luke@doctrinally.ai";

/**
 * True when the given email belongs to the platform super-admin.
 */
export function isSuperAdminEmail(
  email: string | null | undefined
): boolean {
  return !!email && email === SUPER_ADMIN_EMAIL;
}
