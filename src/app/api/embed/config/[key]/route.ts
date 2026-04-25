import { NextResponse } from "next/server";
import { resolvePublicEmbedConfig } from "@/lib/actions/embed";
import {
  corsHeaders,
  getAllowedOrigins,
} from "@/lib/embed/origin";

/**
 * Public resolver the loader script hits on every page load of the
 * church's site. Returns 404 when the widget shouldn't render
 * (missing key, disabled, Standard plan, inactive sub) — the silent
 * downgrade prevents upgrade prompts from leaking to a church's
 * public visitors.
 *
 * Origin handling: if the caller's Origin is in the allowlist we echo
 * it (with Vary: Origin so downstream caches stay honest). If it's
 * NOT, we still return the config with `Access-Control-Allow-Origin: *`
 * — config is public-safe, and a permissive 404 would give attackers a
 * cheap oracle for valid keys. The state-changing routes
 * (/api/embed/session, chat, outreach, prospects) enforce origin
 * strictly; config doesn't need to.
 */

function noCorsHeaders(): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": "*",
    Vary: "Origin",
    "Cache-Control": "public, max-age=60",
  };
}

async function resolveCors(
  request: Request,
  key: string
): Promise<Record<string, string>> {
  const origin = request.headers.get("origin");
  if (!origin) return noCorsHeaders();
  const allowed = await getAllowedOrigins(key);
  if (allowed && allowed.includes(origin)) {
    return {
      ...corsHeaders(origin),
      "Cache-Control": "public, max-age=60",
    };
  }
  return noCorsHeaders();
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ key: string }> }
) {
  const { key } = await params;
  const config = await resolvePublicEmbedConfig(key);
  const cors = await resolveCors(request, key);

  if (!config) {
    return new NextResponse(null, { status: 404, headers: cors });
  }

  return NextResponse.json(
    {
      ...config,
      // Site key is public (ships in the page anyway). Returning it
      // here keeps the loader stateless — it only needs to know the
      // embed key up front, and we deliver Turnstile config as part
      // of the config payload.
      turnstileSiteKey: process.env.CF_TURNSTILE_SITE_KEY ?? null,
    },
    { status: 200, headers: cors }
  );
}

export async function OPTIONS(
  request: Request,
  { params }: { params: Promise<{ key: string }> }
) {
  const { key } = await params;
  const cors = await resolveCors(request, key);
  return new NextResponse(null, { status: 204, headers: cors });
}
