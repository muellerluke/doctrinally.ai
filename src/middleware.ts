import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

const protectedPaths = [
  "/dashboard",
  "/documents",
  "/members",
  "/users",
  "/settings",
  "/billing",
  "/onboarding",
];

const authPaths = ["/sign-in", "/sign-up"];

// Paths that should never be blocked on subdomains (API, assets, etc.)
const alwaysAllowPaths = ["/api", "/_next", "/favicon.ico"];

export async function middleware(request: NextRequest) {
  const hostname = request.headers.get("host") || "";
  const appDomain = process.env.NEXT_PUBLIC_APP_DOMAIN || "localhost:3000";
  const { pathname } = request.nextUrl;

  // Skip paths that are always allowed
  if (alwaysAllowPaths.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const isSubdomain =
    hostname !== appDomain &&
    hostname !== `www.${appDomain}` &&
    hostname.endsWith(`.${appDomain}`);

  const isCustomDomain =
    !isSubdomain &&
    hostname !== appDomain &&
    hostname !== `www.${appDomain}`;

  // --- Subdomain routing (e.g. mychurch.doctrinally.ai) ---
  if (isSubdomain) {
    const slug = hostname.replace(`.${appDomain}`, "");
    const response = NextResponse.next();
    response.headers.set("x-church-slug", slug);

    // On subdomains, block admin and auth pages — redirect to chat
    if (
      protectedPaths.some((p) => pathname.startsWith(p)) ||
      authPaths.some((p) => pathname.startsWith(p))
    ) {
      return NextResponse.redirect(new URL("/chat", request.url));
    }

    // Rewrite root to chat page
    if (pathname === "/") {
      const url = request.nextUrl.clone();
      url.pathname = "/chat";
      const rewrite = NextResponse.rewrite(url);
      rewrite.headers.set("x-church-slug", slug);
      return rewrite;
    }

    return response;
  }

  // --- Custom domain routing (e.g. ai.mychurch.com) ---
  if (isCustomDomain) {
    const response = NextResponse.next();
    response.headers.set("x-church-slug", `custom:${hostname}`);

    // On custom domains, block admin and auth pages — redirect to chat
    if (
      protectedPaths.some((p) => pathname.startsWith(p)) ||
      authPaths.some((p) => pathname.startsWith(p))
    ) {
      return NextResponse.redirect(new URL("/chat", request.url));
    }

    // Rewrite root to chat page
    if (pathname === "/") {
      const url = request.nextUrl.clone();
      url.pathname = "/chat";
      const rewrite = NextResponse.rewrite(url);
      rewrite.headers.set("x-church-slug", `custom:${hostname}`);
      return rewrite;
    }

    return response;
  }

  // --- Root domain (doctrinally.ai / localhost:3000) ---
  const isProtected = protectedPaths.some((p) => pathname.startsWith(p));
  const isAuthPage = authPaths.some((p) => pathname.startsWith(p));

  if (isProtected || isAuthPage) {
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    });

    if (isProtected && !token) {
      const signInUrl = new URL("/sign-in", request.url);
      signInUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(signInUrl);
    }

    if (isAuthPage && token) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
