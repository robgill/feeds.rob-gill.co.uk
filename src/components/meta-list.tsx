import type { ReactNode } from "react";

export function MetaList({ rows }: { rows: { term: string; detail: ReactNode }[] }) {
  return (
    <dl className="meta">
      {rows.map((row) => (
        <div key={row.term}>
          <dt>{row.term}</dt>
          <dd>{row.detail}</dd>
        </div>
      ))}
    </dl>
  );
}
