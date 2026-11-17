import { existsSync } from "node:fs";
import path from "node:path";
import type { NeonHttpDatabase } from "drizzle-orm/neon-http";
import type { PgliteDatabase } from "drizzle-orm/pglite";
import type * as schema from "./schema";

export function migrationsFolder(): string {
  return path.join(process.cwd(), "drizzle");
}

export async function migrateDatabase(db: unknown, driver: "pglite" | "neon"): Promise<void> {
  const folder = migrationsFolder();
  if (!existsSync(folder)) {
    throw new Error("Migration files are missing from drizzle/.");
  }

  if (driver === "neon") {
    const { migrate } = await import("drizzle-orm/neon-http/migrator");
    await migrate(db as NeonHttpDatabase<typeof schema>, { migrationsFolder: folder });
    return;
  }

  const { migrate } = await import("drizzle-orm/pglite/migrator");
  await migrate(db as PgliteDatabase<typeof schema>, { migrationsFolder: folder });
}
