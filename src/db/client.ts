import { mkdir } from "node:fs/promises";
import path from "node:path";
import { neon } from "@neondatabase/serverless";
import { drizzle as drizzleNeon } from "drizzle-orm/neon-http";
import { drizzle as drizzlePglite, type PgliteDatabase } from "drizzle-orm/pglite";
import { tables } from "./schema";

type Schema = typeof tables;

/**
 * Neon HTTP and PGlite expose the same query helpers. Typing the connection as
 * one of them avoids a union that hides `onConflictDoNothing({ target })`.
 * The Neon client is cast at the boundary below.
 */
export type Database = PgliteDatabase<Schema>;

type DatabaseSlot = {
  database?: Database;
  driver?: "pglite" | "neon";
  close?: () => Promise<void>;
};

const globalForDb = globalThis as typeof globalThis & { feedsDb?: DatabaseSlot };

function slot(): DatabaseSlot {
  globalForDb.feedsDb ??= {};
  return globalForDb.feedsDb;
}

export function databaseUrl(): string | undefined {
  const url = process.env.DATABASE_URL?.trim();
  return url ? url : undefined;
}

export function localDataDirectory(): string {
  return process.env.PGLITE_DATA_DIR?.trim() || path.join(process.cwd(), "data", "pglite");
}

export function databaseDriver(): "pglite" | "neon" {
  return databaseUrl() ? "neon" : "pglite";
}

export function databaseLabel(): string {
  if (databaseDriver() === "neon") return "Neon/Vercel Postgres";
  const override = process.env.PGLITE_DATA_DIR?.trim();
  return override ? `local PGlite at ${override}` : "local PGlite at data/pglite";
}

export async function getDb(): Promise<Database> {
  const current = slot();
  if (current.database && current.driver === databaseDriver()) return current.database;

  const url = databaseUrl();
  if (url) {
    const database = drizzleNeon(neon(url), { schema: tables }) as unknown as Database;
    current.database = database;
    current.driver = "neon";
    current.close = undefined;
    return database;
  }

  const { PGlite } = await import("@electric-sql/pglite");
  const directory = localDataDirectory();
  await mkdir(path.dirname(directory), { recursive: true });
  const client = new PGlite(directory);
  await client.waitReady;
  const database = drizzlePglite(client, { schema: tables });
  current.database = database;
  current.driver = "pglite";
  current.close = () => client.close();
  return database;
}

export async function closeDb(): Promise<void> {
  const current = slot();
  const close = current.close;
  current.database = undefined;
  current.driver = undefined;
  current.close = undefined;
  await close?.();
}
