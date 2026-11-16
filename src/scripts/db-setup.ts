import { asc, eq } from "drizzle-orm";
import { closeDb, databaseDriver, databaseLabel, getDb } from "@/db/client";
import { migrateDatabase } from "@/db/migrate";
import { seed } from "@/db/seed";
import { destinations, feeds, routes } from "@/db/schema";
import { scheduleLabel } from "@/lib/format";
import { loadEnvFiles } from "./load-env";

loadEnvFiles();

async function main(): Promise<void> {
  const db = await getDb();
  try {
    await migrateDatabase(db, databaseDriver());
    await seed(db);

    const rows = await db
      .select({
        name: feeds.name,
        url: feeds.url,
        cadence: feeds.scheduleCadence,
        time: feeds.scheduleTime,
        timezone: feeds.scheduleTimezone,
        destination: destinations.name,
      })
      .from(feeds)
      .leftJoin(routes, eq(routes.feedId, feeds.id))
      .leftJoin(destinations, eq(destinations.id, routes.destinationId))
      .orderBy(asc(feeds.createdAt), asc(destinations.name));

    console.log(`Database ready (${databaseLabel()}).`);
    console.log("Owner: Rob Gill <rob@provius.co.uk>");
    for (const row of rows) {
      const target = row.destination ?? "no destination";
      console.log(`${row.name} → ${target} (${scheduleLabel(row.cadence, row.time, row.timezone)})`);
      console.log(`  ${row.url}`);
    }
  } finally {
    await closeDb();
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Database setup failed.";
  console.error(message);
  process.exit(1);
});
