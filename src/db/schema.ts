import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

/**
 * Counts stored on a run. `inserted` is the number of items new to that feed.
 * Duplicates were already stored, or repeated inside the same document.
 * Skipped items had neither a guid nor a link, so they cannot be deduped.
 */
export type RunCounts = {
  fetched: number;
  inserted: number;
  duplicates: number;
  skipped: number;
};

/**
 * Destination settings that are safe to store.
 * Secrets (webhook URLs and similar) are named by environment variable, never stored.
 */
export type DestinationConfig = {
  webhookUrlEnv?: string;
  toEnv?: string;
};

export const destinationTypes = ["slack", "email", "browser"] as const;
export type DestinationType = (typeof destinationTypes)[number];

export const routeFormats = ["summary", "full"] as const;
export type RouteFormat = (typeof routeFormats)[number];

export const users = pgTable("users", {
  id: uuid("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const feeds = pgTable(
  "feeds",
  {
    id: uuid("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    ownerId: uuid("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    url: text("url").notNull(),
    enabled: boolean("enabled").notNull().default(true),
    scheduleCadence: text("schedule_cadence").notNull().default("daily"),
    scheduleTime: text("schedule_time").notNull(),
    scheduleTimezone: text("schedule_timezone").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("feeds_url_unique").on(table.url),
    index("feeds_owner_idx").on(table.ownerId),
    check("feeds_cadence_check", sql`${table.scheduleCadence} in ('daily')`),
  ],
);

export const destinations = pgTable(
  "destinations",
  {
    id: uuid("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    ownerId: uuid("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    name: text("name").notNull(),
    config: jsonb("config").$type<DestinationConfig>().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("destinations_owner_type_name_unique").on(table.ownerId, table.type, table.name),
    index("destinations_owner_idx").on(table.ownerId),
    check("destinations_type_check", sql`${table.type} in ('slack', 'email', 'browser')`),
  ],
);

export const routes = pgTable(
  "routes",
  {
    id: uuid("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    ownerId: uuid("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    feedId: uuid("feed_id")
      .notNull()
      .references(() => feeds.id, { onDelete: "cascade" }),
    destinationId: uuid("destination_id")
      .notNull()
      .references(() => destinations.id, { onDelete: "cascade" }),
    format: text("format").notNull().default("summary"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("routes_feed_destination_unique").on(table.feedId, table.destinationId),
    index("routes_owner_idx").on(table.ownerId),
    check("routes_format_check", sql`${table.format} in ('summary', 'full')`),
  ],
);

export const items = pgTable(
  "items",
  {
    id: uuid("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    feedId: uuid("feed_id")
      .notNull()
      .references(() => feeds.id, { onDelete: "cascade" }),
    dedupeHash: text("dedupe_hash").notNull(),
    title: text("title").notNull(),
    link: text("link"),
    published: timestamp("published", { withTimezone: true }),
    seenAt: timestamp("seen_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("items_feed_dedupe_unique").on(table.feedId, table.dedupeHash),
    index("items_feed_published_idx").on(table.feedId, table.published),
  ],
);

export const runs = pgTable(
  "runs",
  {
    id: uuid("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    feedId: uuid("feed_id")
      .notNull()
      .references(() => feeds.id, { onDelete: "cascade" }),
    started: timestamp("started", { withTimezone: true }).notNull(),
    finished: timestamp("finished", { withTimezone: true }),
    status: text("status").notNull(),
    counts: jsonb("counts").$type<RunCounts>().notNull(),
    error: text("error"),
  },
  (table) => [
    index("runs_feed_started_idx").on(table.feedId, table.started),
    check("runs_status_check", sql`${table.status} in ('ok', 'error')`),
  ],
);

export const tables = { users, feeds, destinations, routes, items, runs };

export type User = typeof users.$inferSelect;
export type Feed = typeof feeds.$inferSelect;
export type Destination = typeof destinations.$inferSelect;
export type Item = typeof items.$inferSelect;
export type Run = typeof runs.$inferSelect;
