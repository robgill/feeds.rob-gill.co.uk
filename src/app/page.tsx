import Link from "next/link";
import { MetaList } from "@/components/meta-list";
import { SetupMessage } from "@/components/setup-message";
import { formatWhen, statusLabel } from "@/lib/format";
import { getHomeStatus, type HomeFeed } from "@/lib/status";

export default async function HomePage() {
  const status = await getHomeStatus();
  if (!status.ready) return <SetupMessage />;

  return (
    <>
      {status.feeds.length === 0 ? <p>No feeds yet.</p> : null}
      {status.feeds.map((feed) => (
        <FeedBlock key={feed.id} feed={feed} />
      ))}
    </>
  );
}

function FeedBlock({ feed }: { feed: HomeFeed }) {
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
      <Link className="more" href={`/feeds/${feed.id}`}>
        Recent items
      </Link>
    </section>
  );
}
