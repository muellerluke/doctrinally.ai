"use server";

import { and, gte, lte } from "drizzle-orm";
import { db } from "@/db";
import { demoBookings } from "@/db/schema";
import {
  createDemoBookingSchema,
  type CreateDemoBookingInput,
} from "@/lib/validations/demo-bookings";
import { isSlotValid } from "@/lib/demo-slots";

export async function createDemoBooking(input: CreateDemoBookingInput) {
  const parsed = createDemoBookingSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const slotStart = new Date(parsed.data.slotStart);
  if (!isSlotValid(slotStart)) {
    return { error: "That time slot isn't available." };
  }
  if (slotStart.getTime() <= Date.now()) {
    return { error: "That slot is in the past — please pick another." };
  }

  try {
    await db.insert(demoBookings).values({
      email: parsed.data.email,
      slotStart,
      agreedToTermsAt: new Date(),
    });
    return { success: true };
  } catch (err) {
    // Drizzle wraps the postgres.js error; the pg code can be on `err` or on `err.cause`.
    const e = err as { code?: string; cause?: { code?: string } };
    const pgCode = e.code ?? e.cause?.code;
    if (pgCode === "23505") {
      return { error: "That slot was just booked — please pick another." };
    }
    throw err;
  }
}

export async function getTakenSlots(fromISO: string, toISO: string) {
  const from = new Date(fromISO);
  const to = new Date(toISO);
  const rows = await db
    .select({ slotStart: demoBookings.slotStart })
    .from(demoBookings)
    .where(
      and(gte(demoBookings.slotStart, from), lte(demoBookings.slotStart, to))
    );
  return rows.map((r) => r.slotStart.toISOString());
}
