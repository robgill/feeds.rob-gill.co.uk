import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { PGlite } from "@electric-sql/pglite";
import { eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/pglite";
import { migrateDatabase } from "../src/db/migrate";
import { tables, feeds, items, runs, users } from "../src/db/schema";
import { fetchFeeds } from "../src/lib/fetch-feeds";

const rss = `<?xml version="1.0"?>
<rss version="2.0">
  <channel>
    <title>Example</title>
    <item>
      <title>First</title>
      <link>https://example.com/first</link>
      <guid>guid-1</guid>
    </item>
    <item>
      <title>Second</title>
      <link>https://example.com/second</link>
    </item>
    <item>
      <title>No identity</title>
    </item>
    <item>
      <title>Repeat of the first</title>
      <link>https://example.com/elsewhere</link>
      <guid>guid-1</guid>
    </item>
  </channel>
</rss>`;

const atom = `<?xml version="1.0"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>Atom</title>
  <entry>
    <title>Atom one</title>
    <link rel="alternate" href="https://example.com/atom-1"/>
    <id>urn:atom-1</id>
    <updated>2026-11-16T11:00:00Z</updated>
  </entry>
</feed>`;

const client = new PGlite();
const db = drizzle(client, { schema: tables });

before(async () => {
  await client.waitReady;
  await migrateDatabase(db, "pglite");
  const [user] = await db
    .insert(users)
    .values({ name: "Rob Gill", email: "rob@provius.co.uk" })
    .returning();
  await db.insert(feeds).values([
    {
      ownerId: user!.id,
      name: "Example",
      url: "https://example.com/rss.xml",
      enabled: true,
      scheduleCadence: "daily",
      scheduleTime: "11:00",
      scheduleTimezone: "Europe/London",
    },
    {
      ownerId: user!.id,
      name: "Paused",
      url: "https://example.com/paused.xml",
      enabled: false,
      scheduleCadence: "daily",
      scheduleTime: "11:00",
      scheduleTimezone: "Europe/London",
    },
    {
      ownerId: user!.id,
      name: "Atom",
      url: "https://example.com/atom.xml",
      enabled: true,
      scheduleCadence: "daily",
      scheduleTime: "11:00",
      scheduleTimezone: "Europe/London",
    },
  ]);
});

after(async () => {
  await client.close();
});

test("running fetch twice adds no duplicates", async () => {
  const fetchImpl: typeof fetch = async (input) => {
    const url = String(input);
    const body = url.endsWith("atom.xml") ? atom : rss;
    return new Response(body, { status: 200, headers: { "content-type": "application/xml" } });
  };

  const first = await fetchFeeds(db, { fetchImpl });
  const second = await fetchFeeds(db, { fetchImpl });

  const stored = await db.select().from(items);
  const [{ count }] = await db.select({ count: sql<number>`count(*)::int` }).from(items);
  const runRows = await db.select().from(runs);

  const example = first.feeds.find((feed) => feed.name === "Example");
  const exampleAgain = second.feeds.find((feed) => feed.name === "Example");
  const paused = first.feeds.find((feed) => feed.name === "Paused");
  const atomFeed = first.feeds.find((feed) => feed.name === "Atom");

  assert.equal(paused, undefined);
  assert.equal(example?.counts.inserted, 2);
  assert.equal(example?.counts.duplicates, 1);
  assert.equal(example?.counts.skipped, 1);
  assert.equal(exampleAgain?.counts.inserted, 0);
  assert.equal(atomFeed?.counts.inserted, 1);
  assert.equal(second.feeds.every((feed) => feed.counts.inserted === 0), true);
  assert.equal(stored.length, 3);
  assert.equal(Number(count), 3);
  assert.equal(runRows.length, 4);

  const exampleFeed = (await db.select().from(feeds).where(eq(feeds.name, "Example")))[0];
  const exampleItems = stored.filter((item) => item.feedId === exampleFeed?.id);
  assert.equal(exampleItems.length, 2);
  assert.deepEqual(
    exampleItems.map((item) => item.title).sort(),
    ["First", "Second"],
  );
});
