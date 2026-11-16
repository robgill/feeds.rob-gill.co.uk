import assert from "node:assert/strict";
import { test } from "node:test";
import { formatWhen, scheduleLabel, statusLabel } from "../src/lib/format";

test("formats times in Britain", () => {
  assert.equal(formatWhen(new Date("2026-11-16T11:00:00.000Z")), "16 Nov 2026, 11:00 GMT");
  assert.equal(formatWhen(new Date("2026-07-16T10:00:00.000Z")), "16 Jul 2026, 11:00 BST");
  assert.equal(formatWhen(null), "Not yet");
});

test("describes a daily London schedule", () => {
  assert.equal(scheduleLabel("daily", "11:00", "Europe/London"), "Daily at 11:00 Europe/London");
  assert.equal(statusLabel("ok"), "OK");
  assert.equal(statusLabel("error"), "Failed");
});
