import { NextResponse } from "next/server";
import { getDb } from "@/db/client";
import { isCronAuthorised } from "@/lib/cron-auth";
import { fetchFeeds } from "@/lib/fetch-feeds";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!isCronAuthorised(request.headers.get("authorization"), process.env.CRON_SECRET)) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const db = await getDb();
  const result = await fetchFeeds(db);
  const ok = result.feeds.every((feed) => feed.status === "ok");
  return NextResponse.json({ ok, feeds: result.feeds }, { status: ok ? 200 : 500 });
}
