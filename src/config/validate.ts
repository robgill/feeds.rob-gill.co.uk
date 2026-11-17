import { destinationTypes, type DestinationConfig, type FeedsConfig } from "./types";

export function assertConfigHasNoSecrets(config: DestinationConfig): void {
  const blob = JSON.stringify(config);
  if (/https?:\/\//i.test(blob)) {
    throw new Error("Destination config must name an environment variable, not store a URL.");
  }
}

function text(value: string | undefined): string {
  return value?.trim() ?? "";
}

export function validClockTime(value: string): boolean {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match) return false;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  return hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59;
}

/** A slice of the environment. `process.env` and a plain object both fit. */
export type OwnerEnv = Record<string, string | undefined>;

export function resolveOwner(config: FeedsConfig, env: OwnerEnv = process.env): { name: string; email: string } {
  const name = text(env.OWNER_NAME) || text(config.owner?.name);
  const email = text(env.OWNER_EMAIL) || text(config.owner?.email);
  if (!name || !email) {
    throw new Error(
      "Set owner.name and owner.email in feeds.config.ts, or set OWNER_NAME and OWNER_EMAIL.",
    );
  }
  if (!email.includes("@") || /\s/.test(email)) {
    throw new Error("Owner email must look like an email address.");
  }
  return { name, email };
}

function assertSchedule(schedule: FeedsConfig["schedule"] | undefined, label: string): void {
  if (!schedule || schedule.cadence !== "daily" || !validClockTime(schedule.time) || !text(schedule.timezone)) {
    throw new Error(
      `${label} needs cadence "daily", time as HH:MM, and an IANA timezone.`,
    );
  }
}

/** Throws when the file cannot be seeded safely. */
export function assertFeedsConfig(config: FeedsConfig): void {
  assertSchedule(config.schedule, "The shared schedule");
  if (!config.destinations?.length) {
    throw new Error("Add at least one destination to feeds.config.ts.");
  }
  if (!config.feeds?.length) {
    throw new Error("Add at least one feed to feeds.config.ts.");
  }

  const destinationNames = new Set<string>();
  for (const destination of config.destinations) {
    const name = text(destination.name);
    if (!name) throw new Error("Every destination needs a name.");
    if (!destinationTypes.includes(destination.type)) {
      throw new Error(`Destination ${name} has an unknown type.`);
    }
    if (destinationNames.has(name)) {
      throw new Error(`Two destinations are named ${name}. Names must be unique.`);
    }
    destinationNames.add(name);
    assertConfigHasNoSecrets(destination.config ?? {});
    if (destination.type === "slack" && !text(destination.config?.webhookUrlEnv)) {
      throw new Error(`Slack destination ${name} needs config.webhookUrlEnv.`);
    }
    if (destination.type === "email" && !text(destination.config?.toEnv)) {
      throw new Error(`Email destination ${name} needs config.toEnv.`);
    }
  }

  const urls = new Set<string>();
  for (const feed of config.feeds) {
    const name = text(feed.name);
    const url = text(feed.url);
    if (!name || !url) throw new Error("Every feed needs a name and a URL.");
    if (!/^https?:\/\//i.test(url)) throw new Error(`Feed ${name} needs an http(s) URL.`);
    if (!destinationNames.has(feed.destination)) {
      throw new Error(`Feed ${name} points at “${feed.destination}”, which is not a destination.`);
    }
    if (urls.has(url)) throw new Error(`Feed URL ${url} is listed twice.`);
    urls.add(url);
    if (Number.isNaN(new Date(feed.createdAt).getTime())) {
      throw new Error(`Feed ${name} has an invalid createdAt.`);
    }
    if (feed.schedule) assertSchedule(feed.schedule, `Feed ${name}`);
  }
}
