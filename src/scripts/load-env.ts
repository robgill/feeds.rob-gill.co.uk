import { existsSync, readFileSync } from "node:fs";

/**
 * Next.js loads .env files for the app. These scripts run outside Next,
 * so they read the same files without overriding variables already set.
 */
export function loadEnvFiles(): void {
  const original = new Set(Object.keys(process.env));
  const values = new Map<string, string>();

  for (const file of [".env", ".env.local"]) {
    if (!existsSync(file)) continue;
    for (const [key, value] of parseEnv(readFileSync(file, "utf8"))) {
      values.set(key, value);
    }
  }

  for (const [key, value] of values) {
    if (!original.has(key)) process.env[key] = value;
  }
}

function parseEnv(source: string): Map<string, string> {
  const values = new Map<string, string>();
  for (const line of source.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separator = trimmed.indexOf("=");
    if (separator === -1) continue;
    const key = trimmed.slice(0, separator).trim();
    let value = trimmed.slice(separator + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (key) values.set(key, value);
  }
  return values;
}
