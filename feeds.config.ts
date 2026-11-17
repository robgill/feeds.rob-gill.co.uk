import type { FeedsConfig } from "./src/config/types";

/**
 * Feeds seeded by `npm run db:setup`.
 *
 * This file is the list the live demo uses. Replace it with your own,
 * or copy `feeds.config.example.ts` over it and edit that.
 * `OWNER_NAME` and `OWNER_EMAIL` override `owner` when they are set
 * in the environment that runs setup.
 *
 * Destination `config` names environment variables. Never put a webhook
 * URL, a password, or an email address in this file.
 */
export const feedsConfig = {
  owner: {
    name: "Rob Gill",
    email: "rob@provius.co.uk",
  },
  schedule: {
    cadence: "daily",
    time: "11:00",
    timezone: "Europe/London",
  },
  destinations: [
    {
      type: "slack",
      name: "#feeds",
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
      name: "Sidebar",
      url: "https://sidebar.io/feed.xml",
      destination: "#feeds",
      mark: ":sidebar:",
      via: "sidebar.io",
      createdAt: "2026-01-01T00:00:00.000Z",
    },
    {
      name: "Glastonbury Festival news",
      url: "https://www.glastonburyfestivals.co.uk/feed/",
      destination: "Personal email",
      mark: null,
      via: "glastonburyfestivals.co.uk",
      createdAt: "2026-01-01T00:00:01.000Z",
    },
    {
      name: "Lenny's Podcast",
      url: "https://api.substack.com/feed/podcast/10845.rss",
      destination: "#feeds",
      mark: ":lennys:",
      via: "lennysnewsletter.com",
      createdAt: "2026-01-01T00:00:02.000Z",
    },
    {
      name: "How I AI",
      url: "https://api.substack.com/feed/podcast/10845/s/198869.rss",
      destination: "#feeds",
      mark: ":howiai:",
      via: "lennysnewsletter.com",
      createdAt: "2026-01-01T00:00:03.000Z",
    },
    {
      name: "Design Details",
      url: "https://feeds.simplecast.com/eew_vyNL",
      destination: "#feeds",
      mark: ":designdetails:",
      via: "designdetails.fm",
      createdAt: "2026-01-01T00:00:04.000Z",
    },
  ],
} satisfies FeedsConfig;
