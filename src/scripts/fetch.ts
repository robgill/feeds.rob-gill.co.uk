import { closeDb, getDb } from "@/db/client";
import { describeFetch, fetchFeeds } from "@/lib/fetch-feeds";
import { loadEnvFiles } from "./load-env";

loadEnvFiles();

async function main(): Promise<void> {
  const db = await getDb();
  try {
    const result = await fetchFeeds(db);
    if (result.feeds.length === 0) {
      console.log("No enabled feeds.");
      return;
    }
    for (const feed of result.feeds) {
      console.log(describeFetch(feed));
    }
    if (result.feeds.some((feed) => feed.status === "error")) {
      process.exitCode = 1;
    }
  } finally {
    await closeDb();
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Fetch failed.";
  console.error(message);
  process.exit(1);
});
