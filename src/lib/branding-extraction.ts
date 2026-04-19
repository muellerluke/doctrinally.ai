import { put } from "@vercel/blob";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { churches } from "@/db/schema";
import { scrapeBranding } from "@/lib/firecrawl";

const ALLOWED_LOGO_MIME = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/svg+xml",
  "image/x-icon",
  "image/vnd.microsoft.icon",
  "image/gif",
]);

const MAX_LOGO_BYTES = 5 * 1024 * 1024;

/**
 * Pull the discovered logo from the church's website, re-host it on
 * Vercel Blob, and return the public Blob URL. Returns null if the URL
 * is missing, the response isn't an image, or the asset is too large.
 *
 * Re-hosting matters for two reasons:
 *  1. Some church sites block hotlinking from foreign origins.
 *  2. We don't want a logo to disappear if the church redesigns their
 *     site between our crawl and their next admin login.
 */
async function downloadLogo(
  sourceUrl: string,
  churchId: string
): Promise<string | null> {
  let res: Response;
  try {
    res = await fetch(sourceUrl, { redirect: "follow" });
  } catch (err) {
    console.warn(`[branding] failed to fetch logo at ${sourceUrl}:`, err);
    return null;
  }

  if (!res.ok) {
    console.warn(`[branding] logo fetch returned ${res.status} for ${sourceUrl}`);
    return null;
  }

  const contentType = (res.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
  if (!ALLOWED_LOGO_MIME.has(contentType)) {
    console.warn(`[branding] unsupported logo content-type "${contentType}" for ${sourceUrl}`);
    return null;
  }

  const lengthHeader = res.headers.get("content-length");
  if (lengthHeader && Number(lengthHeader) > MAX_LOGO_BYTES) {
    console.warn(`[branding] logo too large (${lengthHeader} bytes) at ${sourceUrl}`);
    return null;
  }

  const buf = await res.arrayBuffer();
  if (buf.byteLength > MAX_LOGO_BYTES) {
    console.warn(`[branding] logo too large (${buf.byteLength} bytes) at ${sourceUrl}`);
    return null;
  }

  const ext = mimeToExtension(contentType);
  const filename = `auto-logo-${Date.now()}.${ext}`;

  const blob = await put(`logos/${churchId}/${filename}`, buf, {
    access: "public",
    contentType,
  });

  return blob.url;
}

function mimeToExtension(mime: string): string {
  switch (mime) {
    case "image/png":
      return "png";
    case "image/jpeg":
      return "jpg";
    case "image/webp":
      return "webp";
    case "image/svg+xml":
      return "svg";
    case "image/gif":
      return "gif";
    case "image/x-icon":
    case "image/vnd.microsoft.icon":
      return "ico";
    default:
      return "img";
  }
}

/**
 * Scrape the church's homepage, persist whatever branding we recover
 * onto the `churches` row. Designed to be called from a Trigger.dev job
 * during signup; never throws — failure leaves the church on default
 * branding which the admin can fix in settings later.
 *
 * Only writes columns that we successfully extracted, so we don't
 * overwrite a partially-customized church with nulls.
 */
export async function extractAndApplyBranding(
  churchId: string,
  domain: string
): Promise<{
  appliedLogo: boolean;
  appliedColors: { primary: boolean; accent: boolean; background: boolean; text: boolean };
}> {
  const branding = await scrapeBranding(domain);

  let logoUrl: string | null = null;
  if (branding.logoUrl) {
    try {
      logoUrl = await downloadLogo(branding.logoUrl, churchId);
    } catch (err) {
      console.error("[branding] downloadLogo threw:", err);
    }
  }

  const updates: Record<string, string> = {};
  if (logoUrl) updates.logoUrl = logoUrl;
  if (branding.primaryColor) updates.primaryColor = branding.primaryColor;
  if (branding.accentColor) updates.accentColor = branding.accentColor;
  if (branding.backgroundColor) updates.backgroundColor = branding.backgroundColor;
  if (branding.textColor) updates.textColor = branding.textColor;

  if (Object.keys(updates).length > 0) {
    await db
      .update(churches)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(churches.id, churchId));
  }

  return {
    appliedLogo: !!logoUrl,
    appliedColors: {
      primary: !!branding.primaryColor,
      accent: !!branding.accentColor,
      background: !!branding.backgroundColor,
      text: !!branding.textColor,
    },
  };
}
