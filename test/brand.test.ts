import assert from "node:assert/strict";
import { test } from "node:test";
import { brandFrom } from "../src/lib/brand";

test("the brand is plain unless NEXT_PUBLIC_BRAND is robgill", () => {
  assert.equal(brandFrom(undefined), "plain");
  assert.equal(brandFrom(""), "plain");
  assert.equal(brandFrom("plain"), "plain");
  assert.equal(brandFrom("RobGill"), "plain");
  assert.equal(brandFrom("robgill"), "robgill");
});
