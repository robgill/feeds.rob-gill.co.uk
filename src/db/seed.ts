import { eq } from "drizzle-orm";
import type { Database } from "./client";
import { destinations, feeds, routes, users, type DestinationConfig } from "./schema";

export const OWNER = {
  name: "Rob Gill",
  email: "rob@provius.co.uk",
} as const;

export const SEEDED_DESTINATIONS = [
  {
    type: "slack" as const,
    name: "#feeds",
    config: { webhookUrlEnv: "SLACK_FEEDS_WEBHOOK_URL" } satisfies DestinationConfig,
  },
  {
    type: "email" as const,
    name: "Personal email",
    config: { toEnv: "FEEDS_EMAIL_TO" } satisfies DestinationConfig,
  },
];

export const SEEDED_FEEDS = [
  {
    name: "Sidebar",
    url: "https://sidebar.io/feed.xml",
    destinationName: "#feeds",
    mark: ":sidebar:",
    via: "sidebar.io",
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
  },
  {
    name: "Glastonbury Festival news",
    url: "https://www.glastonburyfestivals.co.uk/feed/",
    destinationName: "Personal email",
    mark: null,
    via: "glastonburyfestivals.co.uk",
    createdAt: new Date("2026-01-01T00:00:01.000Z"),
  },
  {
    name: "Lenny's Podcast",
    url: "https://api.substack.com/feed/podcast/10845.rss",
    destinationName: "#feeds",
    mark: ":lennys:",
    via: "lennysnewsletter.com",
    createdAt: new Date("2026-01-01T00:00:02.000Z"),
  },
  {
    name: "How I AI",
    url: "https://api.substack.com/feed/podcast/10845/s/198869.rss",
    destinationName: "#feeds",
    mark: ":howiai:",
    via: "lennysnewsletter.com",
    createdAt: new Date("2026-01-01T00:00:03.000Z"),
  },
] as const;

const SCHEDULE = {
  scheduleCadence: "daily",
  scheduleTime: "11:00",
  scheduleTimezone: "Europe/London",
} as const;

export function assertConfigHasNoSecrets(config: DestinationConfig): void {
  const blob = JSON.stringify(config);
  if (/https?:\/\//i.test(blob)) {
    throw new Error("Destination config must name an environment variable, not store a URL.");
  }
}

async function ensureUser(db: Database) {
  const inserted = await db
    .insert(users)
    .values({ name: OWNER.name, email: OWNER.email })
    .onConflictDoNothing({ target: users.email })
    .returning();

  const user = inserted[0] ?? (await db.select().from(users).where(eq(users.email, OWNER.email)))[0];
  if (!user) throw new Error("Could not seed the owner.");
  return user;
}

async function ensureDestination(
  db: Database,
  ownerId: string,
  destination: (typeof SEEDED_DESTINATIONS)[number],
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
      await db
        .select()
        .from(destinations)
        .where(eq(destinations.ownerId, ownerId))
    ).find((row) => row.type === destination.type && row.name === destination.name);

  if (!existing) throw new Error(`Could not seed destination ${destination.name}.`);
  return existing;
}

export async function seed(db: Database): Promise<void> {
  const owner = await ensureUser(db);
  const byName = new Map<string, string>();

  for (const destination of SEEDED_DESTINATIONS) {
    const row = await ensureDestination(db, owner.id, destination);
    byName.set(row.name, row.id);
  }

  for (const feed of SEEDED_FEEDS) {
    const inserted = await db
      .insert(feeds)
      .values({
        ownerId: owner.id,
        name: feed.name,
        url: feed.url,
        enabled: true,
        mark: feed.mark,
        via: feed.via,
        createdAt: feed.createdAt,
        ...SCHEDULE,
      })
      .onConflictDoNothing({ target: feeds.url })
      .returning();

    await db.update(feeds).set({ mark: feed.mark, via: feed.via }).where(eq(feeds.url, feed.url));

    const stored =
      inserted[0] ?? (await db.select().from(feeds).where(eq(feeds.url, feed.url)))[0];
    if (!stored) throw new Error(`Could not seed feed ${feed.name}.`);

    const destinationId = byName.get(feed.destinationName);
    if (!destinationId) throw new Error(`Missing destination ${feed.destinationName}.`);

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
