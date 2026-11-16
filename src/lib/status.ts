import { desc, eq, sql } from "drizzle-orm";
import { getDb, type Database } from "@/db/client";
import { destinations, feeds, items, routes, runs, type RunCounts } from "@/db/schema";
import { formatLabel, scheduleLabel } from "./format";

const RECENT_ITEM_LIMIT = 40;

export type LastRun = {
  finished: Date | string | null;
  status: string;
  inserted: number;
  error: string | null;
};

export type HomeFeed = {
  id: string;
  name: string;
  url: string;
  enabled: boolean;
  schedule: string;
  destinations: string[];
  lastRun: LastRun | null;
};

export type HomeStatus = { ready: false } | { ready: true; feeds: HomeFeed[] };

export type FeedItemView = {
  id: string;
  title: string;
  link: string | null;
  published: Date | string | null;
  seenAt: Date | string;
};

export type FeedDetail = {
  id: string;
  name: string;
  url: string;
  enabled: boolean;
  schedule: string;
  destinations: string[];
  formats: string[];
  lastRun: LastRun | null;
  items: FeedItemView[];
};

export type FeedDetailStatus =
  | { ready: false }
  | { ready: true; feed: FeedDetail | null };

export async function getHomeStatus(): Promise<HomeStatus> {
  return readDatabase(async (db) => {
    const feedRows = await db.select().from(feeds).orderBy(feeds.createdAt);
    const routeRows = await db
      .select({
        feedId: routes.feedId,
        name: destinations.name,
      })
      .from(routes)
      .innerJoin(destinations, eq(routes.destinationId, destinations.id))
      .orderBy(destinations.name);
    const latest = await latestRuns(db);
    const names = groupBy(routeRows, (row) => row.feedId, (row) => row.name);

    return {
      ready: true as const,
      feeds: feedRows.map((feed) => ({
        id: feed.id,
        name: feed.name,
        url: feed.url,
        enabled: feed.enabled,
        schedule: scheduleLabel(feed.scheduleCadence, feed.scheduleTime, feed.scheduleTimezone),
        destinations: names.get(feed.id) ?? [],
        lastRun: latest.get(feed.id) ?? null,
      })),
    };
  });
}

export async function getFeedDetail(id: string): Promise<FeedDetailStatus> {
  if (!isUuid(id)) return { ready: true, feed: null };

  return readDatabase(async (db) => {
    const feed = (await db.select().from(feeds).where(eq(feeds.id, id)))[0];
    if (!feed) return { ready: true as const, feed: null };

    const routeRows = await db
      .select({ name: destinations.name, format: routes.format })
      .from(routes)
      .innerJoin(destinations, eq(routes.destinationId, destinations.id))
      .where(eq(routes.feedId, feed.id))
      .orderBy(destinations.name);

    const recent = await db
      .select({
        id: items.id,
        title: items.title,
        link: items.link,
        published: items.published,
        seenAt: items.seenAt,
      })
      .from(items)
      .where(eq(items.feedId, feed.id))
      .orderBy(sql`${items.published} desc nulls last`, desc(items.seenAt))
      .limit(RECENT_ITEM_LIMIT);

    const latest = await latestRuns(db);

    return {
      ready: true as const,
      feed: {
        id: feed.id,
        name: feed.name,
        url: feed.url,
        enabled: feed.enabled,
        schedule: scheduleLabel(feed.scheduleCadence, feed.scheduleTime, feed.scheduleTimezone),
        destinations: routeRows.map((row) => row.name),
        formats: unique(routeRows.map((row) => formatLabel(row.format))),
        lastRun: latest.get(feed.id) ?? null,
        items: recent,
      },
    };
  });
}

async function latestRuns(db: Database): Promise<Map<string, LastRun>> {
  const ranked = db
    .select({
      feedId: runs.feedId,
      finished: runs.finished,
      status: runs.status,
      counts: runs.counts,
      error: runs.error,
      rn: sql<number>`row_number() over (partition by ${runs.feedId} order by ${runs.started} desc)`.as("rn"),
    })
    .from(runs)
    .as("ranked_runs");

  const rows = await db.select().from(ranked).where(sql`${ranked.rn} = 1`);
  return new Map(
    rows.map((row) => [
      row.feedId,
      {
        finished: row.finished,
        status: row.status,
        inserted: countsOf(row.counts).inserted,
        error: row.error,
      },
    ]),
  );
}

async function readDatabase<T extends { ready: true }>(load: (db: Database) => Promise<T>): Promise<T | { ready: false }> {
  try {
    const db = await getDb();
    return await load(db);
  } catch (error) {
    if (isUnreadyDatabase(error)) return { ready: false };
    throw error;
  }
}

function countsOf(value: unknown): RunCounts {
  if (!value || typeof value !== "object" || !("inserted" in value)) {
    return { fetched: 0, inserted: 0, duplicates: 0, skipped: 0 };
  }
  const record = value as Partial<RunCounts>;
  return {
    fetched: numberOf(record.fetched),
    inserted: numberOf(record.inserted),
    duplicates: numberOf(record.duplicates),
    skipped: numberOf(record.skipped),
  };
}

function numberOf(value: unknown): number {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function groupBy<T>(rows: T[], key: (row: T) => string, value: (row: T) => string): Map<string, string[]> {
  const grouped = new Map<string, string[]>();
  for (const row of rows) {
    const bucket = grouped.get(key(row)) ?? [];
    bucket.push(value(row));
    grouped.set(key(row), bucket);
  }
  return grouped;
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function isUnreadyDatabase(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /relation ["']?[a-z_]+["']? does not exist/i.test(message);
}
