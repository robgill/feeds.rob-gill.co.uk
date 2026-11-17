# Feeds

Feeds is a personal RSS router. It reads the feeds you choose and posts new items to Slack on a schedule. The status page is public: anyone with the link can see feed names, URLs and the last run. It never shows a webhook URL or an email address.

The live demo is Rob’s own copy: [feeds.rob-gill.co.uk](https://feeds.rob-gill.co.uk).

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Frobgill%2Ffeeds.rob-gill.co.uk&env=CRON_SECRET,SLACK_FEEDS_WEBHOOK_URL,FEEDS_EMAIL_TO,OWNER_NAME,OWNER_EMAIL&envDescription=CRON_SECRET%20is%20a%20long%20random%20string.%20Neon%20adds%20the%20database%20URL.&project-name=feeds&repository-name=feeds&stores=%5B%7B%22type%22%3A%22integration%22%2C%22integrationSlug%22%3A%22neon%22%2C%22productSlug%22%3A%22neon%22%2C%22protocol%22%3A%22storage%22%7D%5D&demo-title=Feeds&demo-description=A%20personal%20RSS%20router%20that%20posts%20to%20Slack&demo-url=https%3A%2F%2Ffeeds.rob-gill.co.uk&demo-image=https%3A%2F%2Ffeeds.rob-gill.co.uk%2Fog-image.png)

That button clones this repository into your Git account. It asks for `CRON_SECRET`, `SLACK_FEEDS_WEBHOOK_URL`, `FEEDS_EMAIL_TO`, `OWNER_NAME` and `OWNER_EMAIL`, and it offers a Neon Postgres database through Vercel Storage. Neon fills in `DATABASE_URL` and `POSTGRES_URL` for you. You do not paste a database URL into the form.

Built by [Rob Gill](https://rob-gill.co.uk).

## Set it up

1. Create a Neon database when Vercel asks, under Storage. If you missed that step, open the project, go to **Storage**, and create a Neon database there. Connect it to the project.
2. Set the environment variables. `CRON_SECRET` is a long random string. `SLACK_FEEDS_WEBHOOK_URL` is the Slack incoming webhook (you can add it after the first deploy). `FEEDS_EMAIL_TO` is the address for the email destination. Mail is not sent yet, so a placeholder is fine until you want one. `OWNER_NAME` and `OWNER_EMAIL` are optional: when set, they override the owner in `feeds.config.ts` for `npm run db:setup`.
3. Set the **Framework Preset** to **Next.js**, if Vercel has not already chosen it.
4. Deploy.
5. From a checkout of your fork, apply the migrations with the **unpooled** (direct) Neon URL. The pooled URL can stay as the project’s `DATABASE_URL` for the running app.

   ```bash
   DATABASE_URL='postgresql://…' npm run db:setup
   ```

   Setup reads `feeds.config.ts` on the machine where you run it. It is safe to run again.

6. In Slack, create an incoming webhook for the channel named in your config, and put that URL in `SLACK_FEEDS_WEBHOOK_URL`.
7. For each feed with a `mark`, add a custom emoji in that Slack workspace. The shortcode must match, colons included (`:sidebar:`). Without the emoji, Slack shows the shortcode as text.

Before step 5, edit `feeds.config.ts`. The file in this repository is the list the demo uses, so Rob’s deployment keeps the same feeds after setup. A commented starting point is [`feeds.config.example.ts`](feeds.config.example.ts). Copy what you need across, then run setup.

Destination config names environment variables (`webhookUrlEnv`, `toEnv`). Do not put a webhook URL or an email address in the config file.

Running setup again updates names, marks, via lines, schedules, and those environment-variable names. It adds new feeds. It does not delete a feed you removed from the file, and it does not turn a paused feed back on. The owner email is written on the first run. Later runs update the name when the email is unchanged. A new email creates a second user and does not move existing feeds.

## Cron

`vercel.json` schedules `GET /api/cron` for 11:00 UTC every day (`0 11 * * *`). On the Hobby plan that call can land any time during the hour, up to about 59 minutes late.

The route expects `Authorization: Bearer <CRON_SECRET>`. Vercel Cron sends that header when `CRON_SECRET` is set on the project. A missing or wrong token gets `401 Unauthorised`.

Each feed is due once the clock in its time zone has passed the time in `feeds.config.ts` (11:00 `Europe/London` in the file shipped here), and it has not already run since then. In British Summer Time, 11:00 in London is 10:00 UTC, so the 11:00 UTC cron still catches it.

`?now=1` fetches every enabled feed, whether or not it is due:

```bash
curl -i -H "Authorization: Bearer $CRON_SECRET" "https://your-deployment.vercel.app/api/cron?now=1"
```

## First run

The first time a feed posts to Slack, only items from the last 24 hours are sent. Older items are marked as handled, so they are not posted on a later run. After that, a run posts only items that have not been sent.

Email destinations are stored and shown by name on the status page. Email is not sent.

## Run it locally

Node.js 20 or newer. With `DATABASE_URL` and `POSTGRES_URL` unset, the database is a PGlite file in `data/pglite`. You do not need Postgres installed.

```bash
npm install
npm run db:setup
npm run fetch
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Stop the dev server before `npm run db:setup` or `npm run fetch`. PGlite uses one file lock.

Copy `.env.example` to `.env.local` for local values. Next.js reads `.env.local` for `npm run dev`. The scripts also read `.env` and `.env.local`, and they do not override variables already set in the shell.

```bash
npm test
npm run lint
npm run build
```

## Brand

The default look is a plain local theme: system type, a light and dark colour, from the app’s own stylesheet. Nothing is loaded from rob-gill.co.uk. The tab icon is `public/favicon.svg`.

To use the rob-gill.co.uk brand (remote `brand.js` and `brand.css`, the head bitmap linking to [rob-gill.co.uk](https://rob-gill.co.uk), and that site’s share card, icons and manifest), set:

```bash
NEXT_PUBLIC_BRAND=robgill
```

Rob’s deployment needs this value on the Vercel project, for Production, and then a redeploy. Next.js reads `NEXT_PUBLIC_` variables when it builds. Until that variable is set, the live site uses the plain theme. Forks should leave it unset.

Locally, put the same line in `.env.local` and restart `npm run dev`.

With the brand on, the caret cycles light, dark and yellow, the same as rob-gill.co.uk. The plain theme cycles light and dark only. `?theme=dark` previews a theme without saving it.

`public/favicon.ico`, the PNG icons and `og-image.png` belong to that brand and are linked only when `NEXT_PUBLIC_BRAND=robgill`. Browsers that ignore the icon link and request `/favicon.ico` still receive that file.

## Licence

[MIT](LICENSE). Copyright 2026 Rob Gill.
