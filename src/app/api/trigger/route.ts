/**
 * Trigger.dev v3 API route.
 *
 * In Trigger.dev v3, tasks are auto-discovered from the configured `dirs`
 * in trigger.config.ts and deployed via `npx trigger.dev deploy`.
 * They do not need to be registered through a Next.js API route.
 *
 * This route exists as a health-check endpoint and can be extended
 * for custom webhook handling if needed.
 */

import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ status: "ok", service: "trigger.dev" });
}

export async function POST() {
  return NextResponse.json({ status: "ok", service: "trigger.dev" });
}
