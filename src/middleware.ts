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

export async function middleware(request: NextRequest) {
  const hostname = request.headers.get("host") || "";
  const appDomain = process.env.NEXT_PUBLIC_APP_DOMAIN || "localhost:3000";
  const { pathname } = request.nextUrl;

  // Subdomain — e.g. mychurch.doctrinally.ai or mychurch.localhost:3000
  if (
    hostname !== appDomain &&
    hostname !== `www.${appDomain}` &&
    hostname.endsWith(`.${appDomain}`)
  ) {
    const slug = hostname.replace(`.${appDomain}`, "");
    const response = NextResponse.next();
    response.headers.set("x-church-slug", slug);
    return response;
  }

  // Custom domain — e.g. ai.mychurch.com
  if (hostname !== appDomain && hostname !== `www.${appDomain}`) {
    const response = NextResponse.next();
    response.headers.set("x-church-slug", `custom:${hostname}`);
    return response;
  }

  // Root domain — handle auth-based redirects
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
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api).*)"],
};
