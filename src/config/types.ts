/**
 * Shape of feeds.config.ts. Setup reads that file; the running site reads the database.
 * Destination config names environment variables. It must not contain a URL or a secret.
 */

export const destinationTypes = ["slack", "email", "browser"] as const;
export type DestinationType = (typeof destinationTypes)[number];

export type DestinationConfig = {
  /** Environment variable that holds a Slack incoming webhook URL. */
  webhookUrlEnv?: string;
  /** Environment variable that holds an email address. Mail is not sent yet. */
  toEnv?: string;
};

export type FeedSchedule = {
  cadence: "daily";
  /** 24-hour clock, `HH:MM`, in `timezone`. */
  time: string;
  /** IANA time zone, for example `Europe/London`. */
  timezone: string;
};

export type FeedsConfig = {
  /**
   * Written by `npm run db:setup`.
   * `OWNER_NAME` and `OWNER_EMAIL` override these when they are set.
   */
  owner?: {
    name?: string;
    email?: string;
  };
  /** Used for every feed that does not set its own `schedule`. */
  schedule: FeedSchedule;
  destinations: Array<{
    type: DestinationType;
    /** Shown on the status page. Feeds refer to this name. */
    name: string;
    config: DestinationConfig;
  }>;
  feeds: Array<{
    name: string;
    url: string;
    /** Must match a destination `name`. */
    destination: string;
    /** Slack emoji shortcode, for example `:sidebar:`. Omit it for no emoji. */
    mark?: string | null;
    /** Host shown as “via”, for example `sidebar.io`. */
    via?: string | null;
    /** ISO-8601. Earlier dates are listed first. Not changed on later setup runs. */
    createdAt: string;
    /** Overrides the shared schedule for this feed only. */
    schedule?: FeedSchedule;
  }>;
};
