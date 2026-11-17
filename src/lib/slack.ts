import { and, eq, isNull } from "drizzle-orm";
import type { Database } from "@/db/client";
import { destinations, feeds, items, routes, type Item } from "@/db/schema";

const DAY_MS = 24 * 60 * 60 * 1000;

export type SlackPayload = {
  text: string;
  blocks: [
    { type: "section"; text: { type: "mrkdwn"; text: string } },
    { type: "context"; elements: [{ type: "mrkdwn"; text: string }] },
  ];
  unfurl_links: false;
  unfurl_media: false;
};

/** Same shape as robgill/sidebar-to-slack `post.mjs`. */
export function slackPayload(input: {
  title: string;
  link: string;
  description: string | null;
  mark: string | null;
  via: string | null;
}): SlackPayload {
  const title = escapeMrkdwn(input.title);
  const linked = `*<${input.link}|${title}>*`;
  const emoji = input.mark?.trim();
  const description = input.description ? escapeMrkdwn(input.description) : "";
  const headline = emoji ? `${emoji} ${linked}` : linked;
  const viaHost = input.via?.trim().replace(/^https?:\/\//, "").replace(/\/$/, "") || "sidebar.io";
  return {
    text: input.title,
    blocks: [
      {
        type: "section",
        text: { type: "mrkdwn", text: description ? `${headline}\n${description}` : headline },
      },
      {
        type: "context",
        elements: [{ type: "mrkdwn", text: `via <https://${viaHost}|${viaHost}>` }],
      },
    ],
    unfurl_links: false,
    unfurl_media: false,
  };
}

export function itemsToPost(rows: Item[], firstRun: boolean, now: Date): Item[] {
  const unsent = rows.filter((row) => row.link && !row.slackPostedAt);
  const oldestFirst = [...unsent].sort((a, b) => time(a.published) - time(b.published));
  if (!firstRun) return oldestFirst;
  const cutoff = now.getTime() - DAY_MS;
  const recent = oldestFirst.filter((row) => row.published && new Date(row.published).getTime() >= cutoff);
  return recent;
}

export type SlackPostResult = {
  feedId: string;
  name: string;
  posted: number;
  skipped: string | null;
  error: string | null;
};

export async function postSlackFeeds(db: Database, feedIds: string[], now = new Date()): Promise<SlackPostResult[]> {
  if (feedIds.length === 0) return [];
  const results: SlackPostResult[] = [];
  for (const feedId of feedIds) {
    results.push(await postOne(db, feedId, now));
  }
  return results;
}

async function postOne(db: Database, feedId: string, now: Date): Promise<SlackPostResult> {
  const feed = (await db.select().from(feeds).where(eq(feeds.id, feedId)))[0];
  if (!feed) return { feedId, name: feedId, posted: 0, skipped: null, error: "Feed is missing." };

  const slackRoutes = await db
    .select({ config: destinations.config, name: destinations.name, type: destinations.type })
    .from(routes)
    .innerJoin(destinations, eq(destinations.id, routes.destinationId))
    .where(eq(routes.feedId, feedId));

  const slack = slackRoutes.find((route) => route.type === "slack");
  if (!slack) {
    const email = slackRoutes.some((route) => route.type === "email");
    return {
      feedId,
      name: feed.name,
      posted: 0,
      skipped: email ? "Email is not implemented." : "No Slack route.",
      error: null,
    };
  }

  const envName = slack.config.webhookUrlEnv;
  const webhook = envName ? process.env[envName] : undefined;
  if (!envName || !webhook) {
    return {
      feedId,
      name: feed.name,
      posted: 0,
      skipped: null,
      error: `Set ${envName || "the Slack webhook env var"} to post to ${slack.name}.`,
    };
  }

  const stored = await db.select().from(items).where(eq(items.feedId, feedId));
  const already = stored.some((row) => row.slackPostedAt);
  const firstRun = !already;
  const queue = itemsToPost(stored, firstRun, now);
  if (firstRun) {
    // Everything older than a day becomes the baseline: marked as handled so it never posts later.
    const queued = new Set(queue.map((item) => item.id));
    for (const row of stored) {
      if (row.slackPostedAt || queued.has(row.id)) continue;
      await db.update(items).set({ slackPostedAt: now }).where(eq(items.id, row.id));
    }
  }
  let posted = 0;
  for (const item of queue) {
    if (!item.link) continue;
    const payload = slackPayload({
      title: item.title,
      link: item.link,
      description: item.description,
      mark: feed.mark,
      via: feed.via,
    });
    const response = await fetch(webhook, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      return {
        feedId,
        name: feed.name,
        posted,
        skipped: null,
        error: `Slack responded with ${response.status}.`,
      };
    }
    await db
      .update(items)
      .set({ slackPostedAt: now })
      .where(and(eq(items.id, item.id), isNull(items.slackPostedAt)));
    posted += 1;
  }
  return { feedId, name: feed.name, posted, skipped: null, error: null };
}

function escapeMrkdwn(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function time(value: Date | string | null): number {
  if (!value) return 0;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}
