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
// `/embed` hosts the public iframe + loader and is served from the root
// domain only — churches paste the root-domain script URL into their own
// sites, so subdomain rewrites must not interfere with these requests.
const alwaysAllowPaths = [
  "/api",
  "/_next",
  "/favicon.ico",
  "/embed",
  "/embed.js",
];

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
      const requestHeaders = new Headers(request.headers);
      requestHeaders.set("x-church-slug", slug);
      requestHeaders.set("x-pathname", pathname);
      return NextResponse.rewrite(url, { request: { headers: requestHeaders } });
    }

    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-church-slug", slug);
    requestHeaders.set("x-pathname", pathname);
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  // --- Custom domain routing (e.g. ai.mychurch.com) ---
  if (isCustomDomain) {
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
      const requestHeaders = new Headers(request.headers);
      requestHeaders.set("x-church-slug", `custom:${hostname}`);
      requestHeaders.set("x-pathname", pathname);
      return NextResponse.rewrite(url, { request: { headers: requestHeaders } });
    }

    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-church-slug", `custom:${hostname}`);
    requestHeaders.set("x-pathname", pathname);
    return NextResponse.next({ request: { headers: requestHeaders } });
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

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", pathname);
  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
