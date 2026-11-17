import assert from "node:assert/strict";
import { test } from "node:test";
import { PGlite } from "@electric-sql/pglite";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/pglite";
import { exampleFeedsConfig } from "../feeds.config.example";
import { feedsConfig } from "../feeds.config";
import { migrateDatabase } from "../src/db/migrate";
import { seed } from "../src/db/seed";
import { destinations, feeds, routes, tables, users } from "../src/db/schema";
import { assertConfigHasNoSecrets, assertFeedsConfig, resolveOwner } from "../src/config/validate";

test("the shipped config is the live demo and keeps secrets out of destinations", () => {
  assertFeedsConfig(feedsConfig);
  assert.equal(resolveOwner(feedsConfig, {}).name, "Rob Gill");
  assert.equal(resolveOwner(feedsConfig, {}).email, "rob@provius.co.uk");
  assert.deepEqual(resolveOwner(feedsConfig, { OWNER_NAME: "Ada Lovelace", OWNER_EMAIL: "ada@example.com" }), {
    name: "Ada Lovelace",
    email: "ada@example.com",
  });
  assert.equal(resolveOwner(feedsConfig, { OWNER_NAME: "  ", OWNER_EMAIL: "" }).name, "Rob Gill");
  assert.equal(feedsConfig.schedule.time, "11:00");
  assert.equal(feedsConfig.schedule.timezone, "Europe/London");

  for (const destination of feedsConfig.destinations) {
    assertConfigHasNoSecrets(destination.config);
  }
  const blob = JSON.stringify(feedsConfig.destinations);
  assert.match(blob, /SLACK_FEEDS_WEBHOOK_URL/);
  assert.match(blob, /FEEDS_EMAIL_TO/);
  assert.doesNotMatch(blob, /https?:\/\//);
  assert.deepEqual(
    feedsConfig.feeds.map((feed) => ({
      name: feed.name,
      url: feed.url,
      destination: feed.destination,
      mark: feed.mark ?? null,
      via: feed.via ?? null,
    })),
    [
      {
        name: "Sidebar",
        url: "https://sidebar.io/feed.xml",
        destination: "#feeds",
        mark: ":sidebar:",
        via: "sidebar.io",
      },
      {
        name: "Glastonbury Festival news",
        url: "https://www.glastonburyfestivals.co.uk/feed/",
        destination: "Personal email",
        mark: null,
        via: "glastonburyfestivals.co.uk",
      },
      {
        name: "Lenny's Podcast",
        url: "https://api.substack.com/feed/podcast/10845.rss",
        destination: "#feeds",
        mark: ":lennys:",
        via: "lennysnewsletter.com",
      },
      {
        name: "How I AI",
        url: "https://api.substack.com/feed/podcast/10845/s/198869.rss",
        destination: "#feeds",
        mark: ":howiai:",
        via: "lennysnewsletter.com",
      },
      {
        name: "Design Details",
        url: "https://feeds.simplecast.com/eew_vyNL",
        destination: "#feeds",
        mark: ":designdetails:",
        via: "designdetails.fm",
      },
    ],
  );
});

test("the example config is a documented placeholder", () => {
  assertFeedsConfig(exampleFeedsConfig);
  assert.notEqual(exampleFeedsConfig.owner?.email, feedsConfig.owner?.email);
  assert.doesNotMatch(JSON.stringify(exampleFeedsConfig.destinations), /https?:\/\//);
  assert.doesNotMatch(JSON.stringify(exampleFeedsConfig), /hooks\.slack\.com/);
  assert.throws(() => assertConfigHasNoSecrets({ webhookUrlEnv: "https://hooks.slack.com/services/T/B/secret" }), /URL/);
});

test("seed writes the config and lets the environment name the owner", async () => {
  const client = new PGlite();
  const db = drizzle(client, { schema: tables });
  await client.waitReady;
  await migrateDatabase(db, "pglite");
  await seed(db, { OWNER_NAME: "Ada Lovelace", OWNER_EMAIL: "ada@example.com" });
  await seed(db, { OWNER_NAME: "Ada Lovelace", OWNER_EMAIL: "ada@example.com" });

  const [owner] = await db.select().from(users);
  assert.equal(owner?.name, "Ada Lovelace");
  assert.equal(owner?.email, "ada@example.com");

  const storedFeeds = await db.select().from(feeds);
  assert.deepEqual(
    storedFeeds.map((feed) => feed.url).sort(),
    feedsConfig.feeds.map((feed) => feed.url).sort(),
  );
  const sidebar = storedFeeds.find((feed) => feed.url === "https://sidebar.io/feed.xml");
  assert.equal(sidebar?.mark, ":sidebar:");
  assert.equal(sidebar?.via, "sidebar.io");
  assert.equal(sidebar?.scheduleTime, "11:00");
  assert.equal(sidebar?.scheduleTimezone, "Europe/London");

  const storedDestinations = await db.select().from(destinations);
  for (const destination of storedDestinations) {
    assertConfigHasNoSecrets(destination.config);
  }

  const glastonbury = storedFeeds.find((feed) => feed.name === "Glastonbury Festival news");
  const route = (
    await db.select().from(routes).where(eq(routes.feedId, glastonbury!.id))
  )[0];
  const email = storedDestinations.find((destination) => destination.id === route?.destinationId);
  assert.equal(email?.name, "Personal email");
  assert.equal(email?.config.toEnv, "FEEDS_EMAIL_TO");

  await client.close();
});
