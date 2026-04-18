import { formatInTimeZone, fromZonedTime, toZonedTime } from "date-fns-tz";

export const BOOKING_TZ = "America/Chicago";

// day-of-week → [startMinuteOfDay, lastStartMinuteOfDay] inclusive.
// Each tuple defines the first and LAST bookable slot-start time of day.
// Sun=0, Mon=1, Fri=5, Sat=6.
const WINDOWS: Record<number, [number, number] | undefined> = {
  0: [8 * 60, 21 * 60 + 30], // Sunday 8:00 AM – 9:30 PM (last start)
  1: [12 * 60, 16 * 60 + 30], // Monday 12:00 PM – 4:30 PM (last start)
  5: [12 * 60, 16 * 60 + 30], // Friday 12:00 PM – 4:30 PM
  6: [8 * 60, 21 * 60 + 30], // Saturday 8:00 AM – 9:30 PM
};

export function isBookableDay(day: number): boolean {
  return WINDOWS[day] !== undefined;
}

/**
 * Does this UTC `Date` land on a valid booking slot when interpreted in CT?
 * A valid slot is:
 *   - on Mon / Fri / Sat / Sun,
 *   - on a 30-minute boundary (seconds + ms zero, minute 0 or 30),
 *   - within that day's window (by CT wall clock).
 */
export function isSlotValid(date: Date): boolean {
  if (isNaN(date.getTime())) return false;
  if (date.getUTCSeconds() !== 0 || date.getUTCMilliseconds() !== 0) return false;

  const ct = toZonedTime(date, BOOKING_TZ);
  const day = ct.getDay();
  const window = WINDOWS[day];
  if (!window) return false;

  const minute = ct.getMinutes();
  if (minute !== 0 && minute !== 30) return false;

  const minuteOfDay = ct.getHours() * 60 + minute;
  return minuteOfDay >= window[0] && minuteOfDay <= window[1];
}

/**
 * Generate every valid slot-start as a UTC `Date` across `days` calendar days
 * starting from the CT day containing `fromDate`. Slots in the past (<= now)
 * are omitted.
 */
export function generateSlots(fromDate: Date, days: number): Date[] {
  const now = Date.now();
  const slots: Date[] = [];

  for (let d = 0; d < days; d++) {
    const ctDay = toZonedTime(fromDate, BOOKING_TZ);
    ctDay.setDate(ctDay.getDate() + d);
    ctDay.setHours(0, 0, 0, 0);

    const window = WINDOWS[ctDay.getDay()];
    if (!window) continue;

    for (let m = window[0]; m <= window[1]; m += 30) {
      const wallClock = new Date(ctDay);
      wallClock.setHours(Math.floor(m / 60), m % 60, 0, 0);
      const utc = fromZonedTime(wallClock, BOOKING_TZ);
      if (utc.getTime() > now) slots.push(utc);
    }
  }

  return slots;
}

export function formatSlotLabel(date: Date): string {
  return formatInTimeZone(date, BOOKING_TZ, "EEE, MMM d · h:mm a") + " CT";
}

export function formatSlotTime(date: Date): string {
  return formatInTimeZone(date, BOOKING_TZ, "h:mm a");
}

export function isSameCtDay(a: Date, b: Date): boolean {
  return (
    formatInTimeZone(a, BOOKING_TZ, "yyyy-MM-dd") ===
    formatInTimeZone(b, BOOKING_TZ, "yyyy-MM-dd")
  );
}
