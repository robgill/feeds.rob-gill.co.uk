import assert from "node:assert/strict";
import { test } from "node:test";
import { itemsToPost, slackPayload } from "../src/lib/slack";
import type { Item } from "../src/db/schema";

test("Slack payload matches the Sidebar post", () => {
  const payload = slackPayload({
    title: "Slop is moving up the stack",
    link: "https://example.com/slop",
    description: "The slop moved into design.",
    mark: ":sidebar:",
    via: "sidebar.io",
  });
  assert.equal(payload.text, "Slop is moving up the stack");
  assert.equal(payload.unfurl_links, false);
  assert.equal(payload.unfurl_media, false);
  assert.equal(
    payload.blocks[0].text.text,
    ":sidebar: *<https://example.com/slop|Slop is moving up the stack>*\nThe slop moved into design.",
  );
  assert.equal(payload.blocks[1].elements[0].text, "via <https://sidebar.io|sidebar.io>");
});

test("the first Slack run does not post the whole backlog", () => {
  const now = new Date("2026-11-17T11:00:00.000Z");
  const rows = [
    item("old", "2026-11-01T11:00:00.000Z"),
    item("yesterday", "2026-11-16T12:00:00.000Z"),
    item("today", "2026-11-17T08:00:00.000Z"),
  ];
  assert.deepEqual(
    itemsToPost(rows, true, now).map((row) => row.title),
    ["yesterday", "today"],
  );
  assert.deepEqual(
    itemsToPost([item("old", "2026-11-01T11:00:00.000Z")], true, now).map((row) => row.title),
    [],
  );
  assert.equal(itemsToPost(rows, false, now).length, 3);
});

function item(title: string, published: string): Item {
  return {
    id: title,
    feedId: "feed",
    dedupeHash: title,
    title,
    link: `https://example.com/${title}`,
    description: null,
    published: new Date(published),
    seenAt: new Date(published),
    slackPostedAt: null,
  };
}
