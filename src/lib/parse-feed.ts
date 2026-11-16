import { XMLParser } from "fast-xml-parser";

export type ParsedItem = {
  title: string;
  link: string | null;
  guid: string | null;
  published: Date | null;
};

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  removeNSPrefix: true,
  trimValues: true,
  parseTagValue: false,
  isArray: (name) => name === "item" || name === "entry" || name === "link",
});

export function parseFeed(xml: string): ParsedItem[] {
  const source = xml.replace(/^\uFEFF/, "").trim();
  if (!source) throw new Error("Feed was empty.");

  let document: unknown;
  try {
    document = parser.parse(source);
  } catch {
    throw new Error("Feed XML could not be parsed.");
  }

  if (!document || typeof document !== "object") {
    throw new Error("Feed XML could not be parsed.");
  }

  const record = document as Record<string, unknown>;
  if (record.rss) return parseRss(record);
  if (record.feed) return parseAtom(record);
  throw new Error("Feed is neither RSS nor Atom.");
}

function parseRss(document: Record<string, unknown>): ParsedItem[] {
  const rss = asRecord(first(document.rss));
  const channel = asRecord(first(rss?.channel));
  return asList(channel?.item).map(parseRssItem);
}

function parseRssItem(item: Record<string, unknown>): ParsedItem {
  return {
    title: titleOf(item.title),
    link: linkOf(item.link),
    guid: textOf(item.guid),
    published: dateOf(textOf(item.pubDate) ?? textOf(item.date)),
  };
}

function parseAtom(document: Record<string, unknown>): ParsedItem[] {
  const feed = asRecord(first(document.feed));
  return asList(feed?.entry).map((entry) => ({
    title: titleOf(entry.title),
    link: linkOf(entry.link),
    guid: textOf(entry.id),
    published: dateOf(textOf(entry.published) ?? textOf(entry.updated)),
  }));
}

function titleOf(value: unknown): string {
  return plain(textOf(value) ?? "") || "(untitled)";
}

function plain(value: string): string {
  return decodeEntities(value)
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function decodeEntities(value: string): string {
  return value
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code: string) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

function linkOf(value: unknown): string | null {
  let fallback: string | null = null;
  for (const link of asArray(value)) {
    if (typeof link === "string") {
      const text = link.trim();
      if (text && !fallback) fallback = text;
      continue;
    }
    const record = asRecord(link);
    if (!record) continue;
    const href = typeof record["@_href"] === "string" ? record["@_href"].trim() : "";
    const candidate = href || textOf(record);
    if (!candidate) continue;
    if (record["@_rel"] === "alternate") return candidate;
    if (!fallback) fallback = candidate;
  }
  return fallback;
}

function textOf(value: unknown): string | null {
  if (typeof value === "string") {
    const text = value.trim();
    return text || null;
  }
  if (typeof value === "number") return String(value);
  if (Array.isArray(value)) {
    for (const entry of value) {
      const text = textOf(entry);
      if (text) return text;
    }
    return null;
  }
  const record = asRecord(value);
  if (!record) return null;
  if ("#text" in record) return textOf(record["#text"]);
  return null;
}

function dateOf(value: string | null): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function asList(value: unknown): Record<string, unknown>[] {
  return asArray(value).map(asRecord).filter((entry): entry is Record<string, unknown> => entry !== null);
}

function asArray(value: unknown): unknown[] {
  if (value == null) return [];
  return Array.isArray(value) ? value : [value];
}

function first(value: unknown): unknown {
  return Array.isArray(value) ? value[0] : value;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}
