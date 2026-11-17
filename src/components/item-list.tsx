"use client";

import { useState } from "react";

export type ExpandableItem = {
  id: string;
  title: string;
  link: string | null;
  description: string | null;
  when: string;
};

/** In-place disclosure, same classes as the homepage list expand. */
export function ItemList({ items }: { items: ExpandableItem[] }) {
  const [openId, setOpenId] = useState<string | null>(null);

  if (items.length === 0) return <p className="intro">No items yet.</p>;

  return (
    <div className="list">
      {items.map((item) => {
        const panelId = `item-${item.id}`;
        const open = openId === item.id;
        return (
          <div key={item.id}>
            <button
              type="button"
              className="list-row"
              aria-expanded={open}
              aria-controls={panelId}
              onClick={() => setOpenId(open ? null : item.id)}
            >
              <span className="t">
                <span className="hl">{item.title}</span>
              </span>
              <span className="y">{item.when}</span>
            </button>
            <div className={open ? "list-extra is-expanded" : "list-extra"} id={panelId} inert={open ? undefined : true}>
              <div className="list">
                <p className="intro">{item.description || "No description."}</p>
                {item.link ? (
                  <p className="words-foot">
                    <a className="link ext" href={item.link}>
                      {item.link}
                    </a>
                  </p>
                ) : null}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
