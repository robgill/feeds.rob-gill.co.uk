import { eq, inArray, sql } from "drizzle-orm";
import type { Database } from "@/db/client";
import { feeds, items, runs, type RunCounts } from "@/db/schema";
import { dedupeHash } from "./dedupe";
import { parseFeed, type ParsedItem } from "./parse-feed";

const MAX_FEED_CHARS = 10_000_000;
const USER_AGENT = "feeds.rob-gill.co.uk/0.1 (+https://feeds.rob-gill.co.uk)";

export type FeedFetchResult = {
  feedId: string;
  name: string;
  status: "ok" | "error";
  counts: RunCounts;
  error: string | null;
};

export type FetchFeedsResult = {
  feeds: FeedFetchResult[];
};

export type FetchFeedsOptions = {
  fetchImpl?: typeof fetch;
  now?: () => Date;
  timeoutMs?: number;
  /** When set, only these feeds are fetched. An empty list fetches nothing. */
  feedIds?: string[];
};

const emptyCounts = (): RunCounts => ({
  fetched: 0,
  inserted: 0,
  duplicates: 0,
  skipped: 0,
});

export async function fetchFeeds(db: Database, options: FetchFeedsOptions = {}): Promise<FetchFeedsResult> {
  const enabled = await db
    .select()
    .from(feeds)
    .where(
      options.feedIds
        ? inArray(feeds.id, options.feedIds.length ? options.feedIds : ["00000000-0000-0000-0000-000000000000"])
        : eq(feeds.enabled, true),
    )
    .orderBy(feeds.createdAt);
  const chosen = enabled.filter((feed) => feed.enabled);
  const results: FeedFetchResult[] = [];
  for (const feed of chosen) {
    results.push(await fetchOne(db, feed, options));
  }
  return { feeds: results };
}

async function fetchOne(
  db: Database,
  feed: typeof feeds.$inferSelect,
  options: FetchFeedsOptions,
): Promise<FeedFetchResult> {
  const now = options.now ?? (() => new Date());
  const started = now();

  try {
    const xml = await readFeed(feed.url, options);
    const parsed = parseFeed(xml);
    const counts = await storeNewItems(db, feed.id, parsed);
    const finished = now();
    await db.insert(runs).values({
      feedId: feed.id,
      started,
      finished,
      status: "ok",
      counts,
      error: null,
    });
    return { feedId: feed.id, name: feed.name, status: "ok", counts, error: null };
  } catch (error) {
    const message = errorMessage(error);
    const counts = emptyCounts();
    await db.insert(runs).values({
      feedId: feed.id,
      started,
      finished: now(),
      status: "error",
      counts,
      error: message,
    });
    return { feedId: feed.id, name: feed.name, status: "error", counts, error: message };
  }
}

async function readFeed(url: string, options: FetchFeedsOptions): Promise<string> {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error("Feed URL is not valid.");
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    throw new Error("Feed URL must be http or https.");
  }

  const fetchImpl = options.fetchImpl ?? fetch;
  const timeoutMs = options.timeoutMs ?? 20_000;
  let response: Response;
  try {
    response = await fetchImpl(url, {
      headers: {
        accept: "application/rss+xml, application/atom+xml, application/xml, text/xml;q=0.9, */*;q=0.1",
        "user-agent": USER_AGENT,
      },
      redirect: "follow",
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (error) {
    if (error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError")) {
      throw new Error("Feed request timed out.");
    }
    throw error;
  }

  if (!response.ok) throw new Error(`Feed responded with ${response.status}.`);

  const advertised = Number(response.headers.get("content-length") ?? "0");
  if (Number.isFinite(advertised) && advertised > MAX_FEED_CHARS) {
    throw new Error("Feed is larger than 10 MB.");
  }

  const text = await response.text();
  if (text.length > MAX_FEED_CHARS) throw new Error("Feed is larger than 10 MB.");
  return text;
}

async function storeNewItems(db: Database, feedId: string, parsed: ParsedItem[]): Promise<RunCounts> {
  const seen = new Set<string>();
  let skipped = 0;
  let duplicates = 0;
  const values: (typeof items.$inferInsert)[] = [];

  for (const item of parsed) {
    const hash = dedupeHash(item.guid, item.link);
    if (!hash) {
      skipped += 1;
      continue;
    }
    if (seen.has(hash)) {
      duplicates += 1;
      continue;
    }
    seen.add(hash);
    values.push({
      feedId,
      dedupeHash: hash,
      title: item.title,
      link: item.link,
      description: item.description,
      published: item.published,
    });
  }

  let inserted = 0;
  if (values.length > 0) {
    const known = new Set(
      (
        await db
          .select({ dedupeHash: items.dedupeHash })
          .from(items)
          .where(eq(items.feedId, feedId))
      ).map((row) => row.dedupeHash),
    );
    await db
      .insert(items)
      .values(values)
      .onConflictDoUpdate({
        target: [items.feedId, items.dedupeHash],
        set: {
          description: sql`coalesce(excluded.description, ${items.description})`,
        },
      });
    inserted = values.filter((value) => !known.has(value.dedupeHash)).length;
    duplicates += values.length - inserted;
  }

  return {
    fetched: parsed.length,
    inserted,
    duplicates,
    skipped,
  };
}

function errorMessage(error: unknown): string {
  if (!(error instanceof Error)) return "Unknown fetch error.";
  const cause = error.cause;
  const detail =
    cause instanceof Error && cause.message && cause.message !== error.message ? `: ${cause.message}` : "";
  return `${error.message}${detail}`.slice(0, 500);
}

export function describeFetch(result: FeedFetchResult): string {
  if (result.status === "error") {
    return `${result.name}: failed (${result.error ?? "unknown error"})`;
  }
  const fresh = result.counts.inserted === 1 ? "1 new" : `${result.counts.inserted} new`;
  const stored =
    result.counts.duplicates === 1 ? "1 already stored" : `${result.counts.duplicates} already stored`;
  return `${result.name}: ${fresh}, ${stored}`;
}
