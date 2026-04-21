import { NextResponse } from "next/server";
import { resolvePublicEmbedConfig } from "@/lib/actions/embed";

/**
 * Public resolver that the loader script hits on every page load of the
 * church's site. Returns a 404 whenever the widget shouldn't render
 * (missing key, disabled, Standard plan, inactive subscription). Keeping
 * the downgrade path as a silent 404 prevents upgrade prompts leaking
 * onto a church's public website.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ key: string }> }
) {
  const { key } = await params;
  const config = await resolvePublicEmbedConfig(key);

  if (!config) {
    return new NextResponse(null, {
      status: 404,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, max-age=60",
      },
    });
  }

  return NextResponse.json(config, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      // Short cache so toggling the widget off in settings takes effect
      // within a minute on repeat visits without re-hitting the DB on
      // every page load.
      "Cache-Control": "public, max-age=60",
    },
  });
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Max-Age": "86400",
    },
  });
}
