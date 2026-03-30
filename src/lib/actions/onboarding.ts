"use server";

import { getServerSession } from "next-auth";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { churches, memberships } from "@/db/schema";
import { authOptions } from "@/lib/auth";
import { onboardingSchema } from "@/lib/validations/onboarding";
import { slugify } from "@/lib/utils";

export async function createChurch(input: { name: string; slug?: string }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return { error: "You must be signed in" };
  }

  const slug = input.slug || slugify(input.name);

  const parsed = onboardingSchema.safeParse({ name: input.name, slug });
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const existingSlug = await db.query.churches.findFirst({
    where: eq(churches.slug, parsed.data.slug),
  });

  if (existingSlug) {
    return { error: "This URL is already taken. Please choose a different one." };
  }

  const result = await db.transaction(async (tx) => {
    const [church] = await tx
      .insert(churches)
      .values({
        name: parsed.data.name,
        slug: parsed.data.slug,
        isActive: true,
      })
      .returning({ id: churches.id, slug: churches.slug });

    await tx.insert(memberships).values({
      userId: session.user.id,
      churchId: church.id,
      role: "owner",
    });

    return church;
  });

  return { success: true, slug: result.slug };
}
