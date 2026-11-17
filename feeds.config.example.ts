import type { FeedsConfig } from "./src/config/types";

/**
 * Example starting point. This file is not read by setup.
 *
 * Copy it to feeds.config.ts (or edit feeds.config.ts in place), then run
 * `npm run db:setup`. The copy shipped as feeds.config.ts is the live demo’s
 * list, so a fresh clone posts those feeds until you change it.
 *
 * Owner
 *   Set `owner.name` and `owner.email` here, or set OWNER_NAME and OWNER_EMAIL
 *   in the shell or `.env.local` when you run setup. Environment variables win.
 *   The first setup writes the owner. Later runs update the name when the email
 *   is unchanged. A new email creates a second user and does not move old feeds.
 *
 * Destinations
 *   `name` is what the status page shows, and what each feed’s `destination` matches.
 *   `config` names environment variables only. Do not paste a webhook URL or an
 *   email address here. Those belong in `.env.local` or the host’s env settings.
 *   Slack uses `webhookUrlEnv`. Email uses `toEnv`. Email is stored and shown
 *   by name; it is not sent yet.
 *
 * Feeds
 *   `url` is the RSS or Atom document.
 *   `mark` is a Slack custom-emoji shortcode, colons included (`:reads:`).
 *   Create that emoji in the Slack workspace or the message has a missing mark.
 *   Leave `mark` null when you do not want an emoji.
 *   `via` is the host printed under the post (`example.com`).
 *   `createdAt` is only used to order feeds. Use a unique ISO-8601 timestamp.
 *   Omit `schedule` to use the shared schedule below. Set it on a feed to
 *   override the time or time zone for that feed alone. Cadence is `daily`.
 *
 * Running setup again updates names, marks, via lines, schedules and the
 * environment-variable names on destinations. It adds feeds that are new.
 * It does not delete a feed you removed from this file, and it does not
 * turn a paused feed back on. A feed’s destination is updated to the one named here.
 */

export const exampleFeedsConfig = {
  owner: {
    name: "Your name",
    email: "you@example.com",
  },
  schedule: {
    cadence: "daily",
    time: "11:00",
    timezone: "Europe/London",
  },
  destinations: [
    {
      type: "slack",
      name: "#reads",
      config: { webhookUrlEnv: "SLACK_FEEDS_WEBHOOK_URL" },
    },
    {
      type: "email",
      name: "Personal email",
      config: { toEnv: "FEEDS_EMAIL_TO" },
    },
  ],
  feeds: [
    {
      name: "Example blog",
      url: "https://example.com/feed.xml",
      destination: "#reads",
      mark: ":reads:",
      via: "example.com",
      createdAt: "2026-01-01T00:00:00.000Z",
    },
    {
      name: "Example news",
      url: "https://example.com/news/feed.xml",
      destination: "Personal email",
      mark: null,
      via: "example.com",
      createdAt: "2026-01-01T00:00:01.000Z",
      // schedule: { cadence: "daily", time: "08:30", timezone: "Europe/London" },
    },
  ],
} satisfies FeedsConfig;
