import { cache } from "react";
import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { churches } from "@/db/schema";

export const getCurrentChurch = cache(async () => {
  const headersList = await headers();
  const slug = headersList.get("x-church-slug");

  if (!slug) return null;

  if (slug.startsWith("custom:")) {
    const domain = slug.replace("custom:", "");
    const [church] = await db
      .select()
      .from(churches)
      .where(eq(churches.customDomain, domain))
      .limit(1);
    return church ?? null;
  }

  const [church] = await db
    .select()
    .from(churches)
    .where(eq(churches.slug, slug))
    .limit(1);
  return church ?? null;
});
