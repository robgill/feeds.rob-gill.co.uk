import assert from "node:assert/strict";
import { test } from "node:test";
import { dedupeHash } from "../src/lib/dedupe";
import { parseFeed } from "../src/lib/parse-feed";

const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Example</title>
    <link>https://example.com</link>
    <item>
      <title><![CDATA[First &amp; foremost]]></title>
      <link>https://example.com/first</link>
      <guid isPermaLink="false">guid-1</guid>
      <pubDate>Mon, 16 Nov 2026 11:00:00 GMT</pubDate>
    </item>
    <item>
      <title>No guid</title>
      <link>https://example.com/second</link>
      <pubDate>Sun, 15 Nov 2026 11:00:00 GMT</pubDate>
    </item>
    <item>
      <title>Glastonbury&#8217;s news</title>
      <link>https://example.com/news</link>
    </item>
    <item>
      <title><![CDATA[  <b>Messy</b>   title ]]></title>
      <link>https://example.com/messy</link>
    </item>
  </channel>
</rss>`;

const atom = `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>Example</title>
  <entry>
    <title>Atom one</title>
    <link rel="related" href="https://example.com/related"/>
    <link rel="alternate" type="text/html" href="https://example.com/atom-1"/>
    <id>urn:example:atom-1</id>
    <published>2026-11-16T11:00:00Z</published>
    <updated>2026-11-16T12:00:00Z</updated>
  </entry>
  <entry>
    <title type="html">Atom &amp; two</title>
    <id>urn:example:atom-2</id>
    <updated>2026-11-15T11:00:00Z</updated>
  </entry>
</feed>`;

test("parses RSS titles, links, guids and dates", () => {
  const items = parseFeed(rss);
  assert.equal(items.length, 4);
  assert.deepEqual(
    { title: items[0]?.title, link: items[0]?.link, guid: items[0]?.guid },
    { title: "First & foremost", link: "https://example.com/first", guid: "guid-1" },
  );
  assert.equal(items[0]?.published?.toISOString(), "2026-11-16T11:00:00.000Z");
  assert.equal(items[1]?.guid, null);
  assert.equal(items[1]?.link, "https://example.com/second");
  assert.equal(items[2]?.title, "Glastonbury’s news");
  assert.equal(items[3]?.title, "Messy title");
});

test("parses Atom ids, alternate links and updated dates", () => {
  const items = parseFeed(atom);
  assert.equal(items.length, 2);
  assert.equal(items[0]?.title, "Atom one");
  assert.equal(items[0]?.link, "https://example.com/atom-1");
  assert.equal(items[0]?.guid, "urn:example:atom-1");
  assert.equal(items[0]?.published?.toISOString(), "2026-11-16T11:00:00.000Z");
  assert.equal(items[1]?.title, "Atom & two");
  assert.equal(items[1]?.link, null);
  assert.equal(items[1]?.guid, "urn:example:atom-2");
  assert.equal(items[1]?.published?.toISOString(), "2026-11-15T11:00:00.000Z");
});

test("rejects a document that is neither RSS nor Atom", () => {
  assert.throws(() => parseFeed("<html><title>No</title></html>"), /neither RSS nor Atom/);
});

test("dedupe hash prefers guid and falls back to link", () => {
  const fromGuid = dedupeHash("guid-1", "https://example.com/other");
  const sameGuid = dedupeHash(" guid-1 ", "https://example.com/first");
  const fromLink = dedupeHash(null, " https://example.com/second ");
  const sameLink = dedupeHash("  ", "https://example.com/second");
  assert.equal(fromGuid, sameGuid);
  assert.notEqual(fromGuid, fromLink);
  assert.equal(fromLink, sameLink);
  assert.equal(dedupeHash(null, "  "), null);
  assert.equal(dedupeHash(null, null), null);
});
