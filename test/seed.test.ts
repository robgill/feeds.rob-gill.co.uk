import assert from "node:assert/strict";
import { test } from "node:test";
import { OWNER, SEEDED_DESTINATIONS, SEEDED_FEEDS, assertConfigHasNoSecrets } from "../src/db/seed";

test("seed keeps secrets out of destination config", () => {
  assert.equal(OWNER.name, "Rob Gill");
  assert.equal(OWNER.email, "rob@provius.co.uk");
  for (const destination of SEEDED_DESTINATIONS) {
    assertConfigHasNoSecrets(destination.config);
  }
  const blob = JSON.stringify(SEEDED_DESTINATIONS);
  assert.match(blob, /SLACK_FEEDS_WEBHOOK_URL/);
  assert.match(blob, /FEEDS_EMAIL_TO/);
  assert.doesNotMatch(blob, /https?:\/\//);
  assert.deepEqual(
    SEEDED_FEEDS.map((feed) => feed.url),
    [
      "https://sidebar.io/feed.xml",
      "https://www.glastonburyfestivals.co.uk/feed/",
      "https://api.substack.com/feed/podcast/10845.rss",
      "https://api.substack.com/feed/podcast/10845/s/198869.rss",
      "https://feeds.simplecast.com/eew_vyNL",
    ],
  );
  assert.deepEqual(
    SEEDED_FEEDS.map((feed) => feed.destinationName),
    ["#feeds", "Personal email", "#feeds", "#feeds", "#feeds"],
  );
});
