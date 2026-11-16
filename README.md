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

The root layout loads `https://rob-gill.co.uk/brand.js` (before the stylesheet, with no `async` or `defer`) and `https://rob-gill.co.uk/brand.css`. `brand.js` sets `data-theme` on `<html>` from the `robgill:theme` key in `localStorage`: `light`, `dark` or `yellow`. The theme control on the page saves a choice. `?theme=dark` previews a theme without saving it.

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

Destination config stores the name of an environment variable, never a webhook URL or other secret, and the pages do not show config. The seeded names are `SLACK_FEEDS_WEBHOOK_URL` and `FEEDS_EMAIL_TO`. They are unused until delivery exists.

## Production

Set `DATABASE_URL` to a Neon or Vercel Postgres connection string. The same `npm run db:setup` and `npm run fetch` commands use that database instead of PGlite. Prefer a direct, non-pooled URL for setup.

`vercel.json` schedules `GET /api/cron` at `0 11 * * *`. Vercel cron is UTC, so that is 11:00 in London while the UK is on GMT and 12:00 while it is on BST. The stored schedule stays 11:00 Europe/London for when delivery follows the clock. The route refuses every request unless `Authorization` is `Bearer` plus `CRON_SECRET`.

```bash
curl -i -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron
```

A missing or wrong token gets `401 Unauthorised`. Copy `.env.example` to `.env.local` for local values. Next.js reads that file for `npm run dev`. The scripts read `.env` and `.env.local` as well, and do not override variables already set in the shell.

The pages are marked `noindex`. There is still no login.
