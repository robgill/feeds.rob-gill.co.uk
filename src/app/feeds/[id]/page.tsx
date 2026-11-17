import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MetaList } from "@/components/meta-list";
import { SetupMessage } from "@/components/setup-message";
import { ItemList } from "@/components/item-list";
import { formatWhen, statusLabel } from "@/lib/format";
import { getFeedDetail } from "@/lib/status";

type PageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const status = await getFeedDetail(id);
  if (!status.ready || !status.feed) return { title: "Feed" };
  return { title: status.feed.name };
}

export default async function FeedPage({ params }: PageProps) {
  const { id } = await params;
  const status = await getFeedDetail(id);
  if (!status.ready) return <SetupMessage />;
  if (!status.feed) notFound();

  const feed = status.feed;
  const lastRun = feed.lastRun;

  return (
    <>
      <Link className="back" href="/">
        All feeds
      </Link>
      <h2 className="feed-title">{feed.name}</h2>
      <p className="quiet">
        <a href={feed.url}>{feed.url}</a>
      </p>
      <MetaList
        rows={[
          { term: "State", detail: feed.enabled ? "Enabled" : "Paused" },
          { term: "Schedule", detail: feed.schedule },
          { term: "To", detail: feed.destinations.length > 0 ? feed.destinations.join(", ") : "None" },
          { term: "Format", detail: feed.formats.length > 0 ? feed.formats.join(", ") : "None" },
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
      <ItemList items={feed.items} />
    </>
  );
}
