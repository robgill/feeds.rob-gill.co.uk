import { formatWhen } from "@/lib/format";

export type ItemListEntry = {
  id: string;
  title: string;
  link: string | null;
  description: string | null;
  published: Date | string | null;
  seenAt: Date | string;
};

export function ItemList({ items }: { items: ItemListEntry[] }) {
  if (items.length === 0) return <p className="intro">No items yet.</p>;

  return (
    <div className="list">
      {items.map((item) => {
        const when = item.published ? formatWhen(item.published) : `Seen ${formatWhen(item.seenAt)}`;
        return (
          <div key={item.id}>
            <div className="list-row">
              <span className="t">
                <span className="hl">{item.title}</span>
              </span>
              <span className="y">{when}</span>
            </div>
            <p className="intro">{item.description || "No description."}</p>
            {item.link ? (
              <p className="words-foot">
                <a className="link ext" href={item.link}>
                  {item.link}
                </a>
              </p>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
