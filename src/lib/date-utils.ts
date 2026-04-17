import { subDays, subMonths } from "date-fns";

export type DateRange = "7d" | "30d" | "90d" | "12m";

export function getDateBounds(range: DateRange) {
  const now = new Date();
  let start: Date;
  let prevStart: Date;

  switch (range) {
    case "7d":
      start = subDays(now, 7);
      prevStart = subDays(now, 14);
      break;
    case "30d":
      start = subDays(now, 30);
      prevStart = subDays(now, 60);
      break;
    case "90d":
      start = subDays(now, 90);
      prevStart = subDays(now, 180);
      break;
    case "12m":
      start = subMonths(now, 12);
      prevStart = subMonths(now, 24);
      break;
  }

  return { start, end: now, prevStart, prevEnd: start };
}

export function getGrouping(range: DateRange): string {
  switch (range) {
    case "7d":
    case "30d":
      return "day";
    case "90d":
      return "week";
    case "12m":
      return "month";
  }
}

export function calcDelta(current: number, previous: number): number | null {
  if (previous === 0) return current > 0 ? 100 : null;
  return Math.round(((current - previous) / previous) * 100);
}
