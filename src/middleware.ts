import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const hostname = request.headers.get("host") || "";
  const appDomain = process.env.NEXT_PUBLIC_APP_DOMAIN || "localhost:3000";

  const response = NextResponse.next();

  // Root domain — pass through for marketing, auth, admin
  if (hostname === appDomain || hostname === `www.${appDomain}`) {
    return response;
  }

  // Subdomain — e.g. mychurch.doctrinally.ai or mychurch.localhost:3000
  if (hostname.endsWith(`.${appDomain}`)) {
    const slug = hostname.replace(`.${appDomain}`, "");
    response.headers.set("x-church-slug", slug);
    return response;
  }

  // Custom domain — e.g. ai.mychurch.com
  response.headers.set("x-church-slug", `custom:${hostname}`);
  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api).*)",
  ],
};
