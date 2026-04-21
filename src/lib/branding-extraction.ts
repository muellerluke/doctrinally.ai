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

// ---------------------------------------------------------------------------
// Color contrast normalization (WCAG 2.1)
// ---------------------------------------------------------------------------

// WCAG minimums. 4.5 for body text, 3.0 for large/UI accents (primary, accent).
const MIN_TEXT_CONTRAST = 4.5;
const MIN_UI_CONTRAST = 3.0;

function hexToRgb(hex: string): [number, number, number] | null {
  const m = hex.trim().match(/^#([0-9a-f]{6})$/i);
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
}

/** WCAG relative luminance for an sRGB color. Output in [0, 1]. */
function relativeLuminance(hex: string): number | null {
  const rgb = hexToRgb(hex);
  if (!rgb) return null;
  const channel = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  const [r, g, b] = rgb.map(channel) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG contrast ratio (1–21). Returns 1 if either input fails to parse. */
function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  if (la == null || lb == null) return 1;
  const lighter = Math.max(la, lb);
  const darker = Math.min(la, lb);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Fix extracted branding so it's readable. Common failure modes the church
 * website hands us — dark text on dark background (or light-on-light), a
 * primary button color that vanishes on the extracted background, etc.
 *
 * Rules:
 *   1. If we have `background` + `text` and their contrast < 4.5, replace
 *      `text` with pure black or pure white (whichever contrasts better
 *      with the background). The admin can edit later.
 *   2. If `background` is set but `text` wasn't extracted, fill in a
 *      readable text so callers don't have to (we already persist bg).
 *   3. If `primary`/`accent` contrast against `background` is below 3.0,
 *      drop that color — better to fall through to our defaults than to
 *      render a button that blends into the page.
 *   4. If we have `text` but no `background`, flip: if text is extremely
 *      dark, drop it (we can't tell whether its usual bg is light).
 *      Keeping it could cause dark-on-dark in chat's default dark mode.
 *      Same for very light text without a background.
 */
function normalizeBranding(input: {
  logoUrl: string | null;
  primaryColor: string | null;
  accentColor: string | null;
  backgroundColor: string | null;
  textColor: string | null;
}): typeof input {
  let { logoUrl, primaryColor, accentColor, backgroundColor, textColor } = input;

  // Rule 4 first — if we have text but no background, we can't reason
  // about contrast, so don't risk a mismatch with whatever default we ship.
  if (textColor && !backgroundColor) {
    textColor = null;
  }

  if (backgroundColor) {
    const bgLum = relativeLuminance(backgroundColor);

    // Rule 1 + 2: ensure readable text on the extracted bg.
    if (bgLum != null) {
      const needsTextFix =
        !textColor ||
        contrastRatio(textColor, backgroundColor) < MIN_TEXT_CONTRAST;
      if (needsTextFix) {
        const fallback = bgLum > 0.5 ? "#111111" : "#f5f5f5";
        if (textColor) {
          console.warn(
            `[branding] text ${textColor} fails contrast vs bg ${backgroundColor}; replacing with ${fallback}`
          );
        }
        textColor = fallback;
      }
    }

    // Rule 3: drop primary/accent that would wash out against bg.
    if (
      primaryColor &&
      contrastRatio(primaryColor, backgroundColor) < MIN_UI_CONTRAST
    ) {
      console.warn(
        `[branding] primary ${primaryColor} fails UI contrast vs bg ${backgroundColor}; dropping`
      );
      primaryColor = null;
    }
    if (
      accentColor &&
      contrastRatio(accentColor, backgroundColor) < MIN_UI_CONTRAST
    ) {
      console.warn(
        `[branding] accent ${accentColor} fails UI contrast vs bg ${backgroundColor}; dropping`
      );
      accentColor = null;
    }
  }

  return { logoUrl, primaryColor, accentColor, backgroundColor, textColor };
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

  const normalized = normalizeBranding({
    logoUrl,
    primaryColor: branding.primaryColor,
    accentColor: branding.accentColor,
    backgroundColor: branding.backgroundColor,
    textColor: branding.textColor,
  });

  const updates: Record<string, string> = {};
  if (normalized.logoUrl) updates.logoUrl = normalized.logoUrl;
  if (normalized.primaryColor) updates.primaryColor = normalized.primaryColor;
  if (normalized.accentColor) updates.accentColor = normalized.accentColor;
  if (normalized.backgroundColor)
    updates.backgroundColor = normalized.backgroundColor;
  if (normalized.textColor) updates.textColor = normalized.textColor;

  if (Object.keys(updates).length > 0) {
    await db
      .update(churches)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(churches.id, churchId));
  }

  return {
    appliedLogo: !!normalized.logoUrl,
    appliedColors: {
      primary: !!normalized.primaryColor,
      accent: !!normalized.accentColor,
      background: !!normalized.backgroundColor,
      text: !!normalized.textColor,
    },
  };
}
