import { and, eq, ne } from "drizzle-orm";
import { feedsConfig } from "../../feeds.config";
import { assertConfigHasNoSecrets, assertFeedsConfig, resolveOwner, type OwnerEnv } from "@/config/validate";
import type { FeedsConfig } from "@/config/types";
import type { Database } from "./client";
import { destinations, feeds, routes, users } from "./schema";

export { assertConfigHasNoSecrets, assertFeedsConfig, resolveOwner };

function scheduleFor(config: FeedsConfig, feed: FeedsConfig["feeds"][number]) {
  const schedule = feed.schedule ?? config.schedule;
  return {
    scheduleCadence: schedule.cadence,
    scheduleTime: schedule.time,
    scheduleTimezone: schedule.timezone,
  };
}

async function ensureUser(db: Database, owner: { name: string; email: string }) {
  const inserted = await db
    .insert(users)
    .values({ name: owner.name, email: owner.email })
    .onConflictDoNothing({ target: users.email })
    .returning();

  const user = inserted[0] ?? (await db.select().from(users).where(eq(users.email, owner.email)))[0];
  if (!user) throw new Error("Could not seed the owner.");
  if (user.name !== owner.name) {
    await db.update(users).set({ name: owner.name }).where(eq(users.id, user.id));
  }
  return user;
}

async function ensureDestination(
  db: Database,
  ownerId: string,
  destination: FeedsConfig["destinations"][number],
) {
  assertConfigHasNoSecrets(destination.config);
  const inserted = await db
    .insert(destinations)
    .values({
      ownerId,
      type: destination.type,
      name: destination.name,
      config: destination.config,
    })
    .onConflictDoNothing({
      target: [destinations.ownerId, destinations.type, destinations.name],
    })
    .returning();

  const existing =
    inserted[0] ??
    (
      await db.select().from(destinations).where(eq(destinations.ownerId, ownerId))
    ).find((row) => row.type === destination.type && row.name === destination.name);

  if (!existing) throw new Error(`Could not seed destination ${destination.name}.`);
  if (!inserted[0]) {
    await db.update(destinations).set({ config: destination.config }).where(eq(destinations.id, existing.id));
  }
  return existing;
}

export async function seed(db: Database, env: OwnerEnv = process.env): Promise<void> {
  assertFeedsConfig(feedsConfig);
  const owner = await ensureUser(db, resolveOwner(feedsConfig, env));
  const byName = new Map<string, string>();

  for (const destination of feedsConfig.destinations) {
    const row = await ensureDestination(db, owner.id, destination);
    byName.set(row.name, row.id);
  }

  for (const feed of feedsConfig.feeds) {
    const schedule = scheduleFor(feedsConfig, feed);
    const inserted = await db
      .insert(feeds)
      .values({
        ownerId: owner.id,
        name: feed.name,
        url: feed.url,
        enabled: true,
        mark: feed.mark ?? null,
        via: feed.via ?? null,
        createdAt: new Date(feed.createdAt),
        ...schedule,
      })
      .onConflictDoNothing({ target: feeds.url })
      .returning();

    await db
      .update(feeds)
      .set({
        name: feed.name,
        mark: feed.mark ?? null,
        via: feed.via ?? null,
        ...schedule,
      })
      .where(eq(feeds.url, feed.url));

    const stored = inserted[0] ?? (await db.select().from(feeds).where(eq(feeds.url, feed.url)))[0];
    if (!stored) throw new Error(`Could not seed feed ${feed.name}.`);

    const destinationId = byName.get(feed.destination);
    if (!destinationId) throw new Error(`Missing destination ${feed.destination}.`);

    await db
      .delete(routes)
      .where(and(eq(routes.feedId, stored.id), ne(routes.destinationId, destinationId)));

    await db
      .insert(routes)
      .values({
        ownerId: owner.id,
        feedId: stored.id,
        destinationId,
        format: "summary",
      })
      .onConflictDoNothing({ target: [routes.feedId, routes.destinationId] });
  }
}
