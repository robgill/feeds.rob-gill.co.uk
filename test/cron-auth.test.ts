import assert from "node:assert/strict";
import { test } from "node:test";
import { isCronAuthorised } from "../src/lib/cron-auth";

test("cron route accepts only the bearer token", () => {
  assert.equal(isCronAuthorised("Bearer secret", "secret"), true);
  assert.equal(isCronAuthorised("Bearer secret", "other"), false);
  assert.equal(isCronAuthorised("secret", "secret"), false);
  assert.equal(isCronAuthorised(null, "secret"), false);
  assert.equal(isCronAuthorised("Bearer secret", undefined), false);
  assert.equal(isCronAuthorised("Bearer secret", ""), false);
});
