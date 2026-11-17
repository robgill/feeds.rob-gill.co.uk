# Feeds

Personal RSS router for [feeds.rob-gill.co.uk](https://feeds.rob-gill.co.uk).
Repository: [robgill/feeds.rob-gill.co.uk](https://github.com/robgill/feeds.rob-gill.co.uk).

The app reads RSS and Atom, stores only new items, and records each run. Slack, email and browser delivery are not built yet. The pages are read-only: there is no login and no editing.

There is one owner, Rob Gill (`rob@provius.co.uk`). Feeds, destinations and routes store his user id so adding people later is not a rewrite. Nothing in the interface switches account.

## Run it locally

Node.js 20 or newer. No Postgres, Docker, or other accounts. With `DATABASE_URL` unset, the database is a PGlite file in `data/pglite`.

```bash
npm install
npm run db:setup
npm run fetch
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

`npm run db:setup` creates the tables and seeds the owner, the two feeds and the two placeholder destinations. It is safe to run again. `npm run fetch` downloads enabled feeds and stores new items. Run it again and it adds nothing already stored.

Stop the dev server before `npm run db:setup` or `npm run fetch`. The local database uses one file lock.

```bash
npm test
npm run lint
npm run build
```

## Theme

The root layout loads `https://rob-gill.co.uk/brand.js` (before the stylesheet, with no `async` or `defer`) and `https://rob-gill.co.uk/brand.css`. `brand.js` sets `data-theme` on `<html>` from the `robgill:theme` key in `localStorage`: `light`, `dark` or `yellow`. The masthead is the same 110-cell head as [rob-gill.co.uk](https://rob-gill.co.uk), drawn at rest at 220px, and it links there. The word “feeds” is followed by the homepage caret: a 1.1s step blink, still when reduced motion is on. Clicking it cycles the theme through `window.robgillSetTheme` and saves the choice. `?theme=dark` previews a theme without saving it.

Colours and type come from the brand tokens (`--bg`, `--text`, `--grey-1` to `--grey-5`, `--accent`, `--font`, `--fs-body`, `--fs-small`, `--fs-title`, `--lh`, `--unit`).

## Feeds

| Feed | URL | Goes to | Schedule |
| --- | --- | --- | --- |
| Sidebar | https://sidebar.io/feed.xml | #feeds (Slack) | Daily at 11:00 Europe/London |
| Glastonbury Festival news | https://www.glastonburyfestivals.co.uk/feed/ | Personal email | Daily at 11:00 Europe/London |

Sidebar links its feed from the homepage: `https://sidebar.io/feed.xml`.

Glastonbury’s news index does not publish its own posts feed. `https://www.glastonburyfestivals.co.uk/news/feed/` is an empty WordPress comments feed titled “Comments on: News”. The articles listed on `/news/` are the site’s posts, and the official posts feed is `https://www.glastonburyfestivals.co.uk/feed/` (channel title “Glastonbury Festivals”). That is the URL seeded here. Both routes use the `summary` format. Nothing is delivered yet.

## Data

- `users`: id, name, email
- `feeds`: owner, name, url, enabled, schedule (cadence, time, timezone)
- `destinations`: owner, type (`slack`, `email` or `browser`), name, config JSON
- `routes`: owner, feed, destination, format (`summary` or `full`)
- `items`: feed, dedupe hash, title, link, published, seen at
- `runs`: feed, started, finished, status (`ok` or `error`), counts, error

The dedupe hash is SHA-256 of the item’s guid when it has one, otherwise of its link. Items with neither are skipped. A run is one fetch of one feed. Counts are `fetched`, `inserted`, `duplicates` and `skipped`.

Destination config stores the name of an environment variable, never a webhook URL or other secret, and the pages do not show config. The seeded Slack destination names `SLACK_FEEDS_WEBHOOK_URL`. Email names `FEEDS_EMAIL_TO` and is not sent yet.

Sidebar posts with the mark `:sidebar:` and the via-line `sidebar.io`, the same message as `robgill/sidebar-to-slack`.

## Production

On Vercel, set:

- `DATABASE_URL` or `POSTGRES_URL`: a Neon or Vercel Postgres connection string
- `CRON_SECRET`: the bearer token Vercel Cron sends, and that you send for a manual run
- `SLACK_FEEDS_WEBHOOK_URL`: the incoming webhook for `#feeds`

After the first deploy, from this directory with that database URL in the environment:

```bash
npm run db:setup
```

That applies the migrations and seed. It is safe to run again.

`vercel.json` calls `GET /api/cron` daily at `0 11 * * *` UTC. The handler fetches feeds that are due (daily at 11:00 Europe/London, and not already run since that time) and posts new Slack items. The first post for a feed only includes items from the last 24 hours, or the single newest item if none are that recent. Later runs post only items that have not been marked sent. Email routes are skipped.

Run it by hand:

```bash
curl -i -H "Authorization: Bearer $CRON_SECRET" "https://feeds.rob-gill.co.uk/api/cron?now=1"
```

`now=1` fetches every enabled feed, not only those that are due. Omit it to follow the schedule. A missing or wrong token gets `401 Unauthorised`.

Copy `.env.example` to `.env.local` for local values. Next.js reads that file for `npm run dev`. The scripts read `.env` and `.env.local` as well, and do not override variables already set in the shell.

The pages are marked `noindex`. There is still no login.
