import { encode } from "next-auth/jwt";

/**
 * Produce a real NextAuth JWT for a given userId and return it as a
 * cookie-ready value. Use in Request headers for server-action tests:
 *
 *   const cookie = await stampSessionCookie(user.id, user.email);
 *   const request = new Request(..., {
 *     headers: { cookie: `${cookie.name}=${cookie.value}` }
 *   });
 *
 * The route handler's real getServerSession() decodes the real JWT — same
 * path prod uses.
 */
export async function stampSessionCookie(userId: string, email: string) {
  const token = await encode({
    token: { sub: userId, email, name: "Test User" },
    secret: process.env.NEXTAUTH_SECRET!,
  });
  // Cookie name matches NextAuth's default (non-HTTPS). In production this
  // would be `__Secure-next-auth.session-token` but tests run over http.
  return { name: "next-auth.session-token", value: token };
}
