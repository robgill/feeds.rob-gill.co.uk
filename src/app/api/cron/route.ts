import { NextResponse } from "next/server";
import { getDb } from "@/db/client";
import { isCronAuthorised } from "@/lib/cron-auth";
import { dueFeedIds } from "@/lib/due";
import { fetchFeeds } from "@/lib/fetch-feeds";
import { postSlackFeeds } from "@/lib/slack";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!isCronAuthorised(request.headers.get("authorization"), process.env.CRON_SECRET)) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const force = new URL(request.url).searchParams.get("now") === "1";
  const db = await getDb();
  const feedIds = force ? undefined : await dueFeedIds(db);
  const fetched = await fetchFeeds(db, feedIds ? { feedIds } : {});
  const posted = await postSlackFeeds(
    db,
    fetched.feeds.filter((feed) => feed.status === "ok").map((feed) => feed.feedId),
  );
  const ok = fetched.feeds.every((feed) => feed.status === "ok") && posted.every((feed) => !feed.error);
  return NextResponse.json({ ok, forced: force, feeds: fetched.feeds, slack: posted }, { status: ok ? 200 : 500 });
}
