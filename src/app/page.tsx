import Link from "next/link";
import { ItemList } from "@/components/item-list";
import { MetaList } from "@/components/meta-list";
import { SetupMessage } from "@/components/setup-message";
import { formatWhen, statusLabel } from "@/lib/format";
import { getFeedDetail, getHomeStatus, type FeedItemView, type HomeFeed } from "@/lib/status";

export default async function HomePage() {
  const status = await getHomeStatus();
  if (!status.ready) return <SetupMessage />;

  const blocks: { feed: HomeFeed; items: FeedItemView[] }[] = [];
  for (const feed of status.feeds) {
    const detail = await getFeedDetail(feed.id);
    blocks.push({
      feed,
      items: detail.ready && detail.feed ? detail.feed.items : [],
    });
  }

  return (
    <>
      {blocks.length === 0 ? <p>No feeds yet.</p> : null}
      {blocks.map(({ feed, items }) => (
        <FeedBlock key={feed.id} feed={feed} items={items} />
      ))}
    </>
  );
}

function FeedBlock({ feed, items }: { feed: HomeFeed; items: FeedItemView[] }) {
  const lastRun = feed.lastRun;
  return (
    <section className="feed">
      <div className="feed-head">
        <h2>
          <Link href={`/feeds/${feed.id}`}>{feed.name}</Link>
        </h2>
        <p>{feed.enabled ? "Enabled" : "Paused"}</p>
      </div>
      <p className="quiet">
        <a href={feed.url}>{feed.url}</a>
      </p>
      <MetaList
        rows={[
          { term: "Schedule", detail: feed.schedule },
          { term: "To", detail: feed.destinations.length > 0 ? feed.destinations.join(", ") : "None" },
          { term: "Last run", detail: formatWhen(lastRun?.finished) },
          {
            term: "Status",
            detail: lastRun ? (
              <>
                {statusLabel(lastRun.status)}
                {lastRun.error ? <span className="run-error">{lastRun.error}</span> : null}
              </>
            ) : (
              "Not yet"
            ),
          },
          { term: "New items", detail: lastRun ? String(lastRun.inserted) : "Not yet" },
        ]}
      />
      <details className="recent">
        <summary className="more">Recent items</summary>
        <ItemList items={items} />
      </details>
    </section>
  );
}
