import { desc, eq } from "drizzle-orm";
import type { Database } from "@/db/client";
import { feeds, runs, type Feed } from "@/db/schema";

/** A daily feed is due once today's clock time has passed and it has not run since then. */
export function isDue(feed: Pick<Feed, "scheduleTime" | "scheduleTimezone" | "scheduleCadence">, lastStarted: Date | null, now: Date): boolean {
  if (feed.scheduleCadence !== "daily") return false;
  const scheduled = scheduledToday(feed.scheduleTime, feed.scheduleTimezone, now);
  if (!scheduled || now.getTime() < scheduled.getTime()) return false;
  if (!lastStarted) return true;
  return lastStarted.getTime() < scheduled.getTime();
}

export async function dueFeedIds(db: Database, now = new Date()): Promise<string[]> {
  const enabled = await db.select().from(feeds).where(eq(feeds.enabled, true));
  const ids: string[] = [];
  for (const feed of enabled) {
    const last = (
      await db.select({ started: runs.started }).from(runs).where(eq(runs.feedId, feed.id)).orderBy(desc(runs.started)).limit(1)
    )[0];
    if (isDue(feed, last?.started ?? null, now)) ids.push(feed.id);
  }
  return ids;
}

function scheduledToday(time: string, timeZone: string, now: Date): Date | null {
  const match = /^(\d{2}):(\d{2})$/.exec(time);
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  const parts = partsInZone(now, timeZone);
  if (!parts) return null;
  const guess = new Date(Date.UTC(parts.year, parts.month - 1, parts.day, hour, minute, 0));
  const offset = zoneOffset(guess, timeZone);
  const scheduled = new Date(guess.getTime() - offset);
  const check = partsInZone(scheduled, timeZone);
  if (!check || check.hour !== hour || check.minute !== minute) {
    const adjusted = new Date(scheduled.getTime() - zoneOffset(scheduled, timeZone) + offset);
    return adjusted;
  }
  return scheduled;
}

function zoneOffset(date: Date, timeZone: string): number {
  const parts = partsInZone(date, timeZone);
  if (!parts) return 0;
  const asUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
  return asUtc - date.getTime();
}

function partsInZone(date: Date, timeZone: string): {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
} | null {
  try {
    const list = new Intl.DateTimeFormat("en-GB", {
      timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }).formatToParts(date);
    const value = (type: string) => Number(list.find((part) => part.type === type)?.value);
    const year = value("year");
    const month = value("month");
    const day = value("day");
    const hour = value("hour");
    const minute = value("minute");
    const second = value("second");
    if ([year, month, day, hour, minute, second].some((part) => Number.isNaN(part))) return null;
    return { year, month, day, hour, minute, second };
  } catch {
    return null;
  }
}
