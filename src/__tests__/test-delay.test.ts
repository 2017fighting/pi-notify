/**
 * Tests for the optional delay argument of `/notify:test`.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { parseTestDelay, TEST_DELAY_MAX_SECONDS } from "../../commands.ts";

describe("parseTestDelay", () => {
  it("defaults to zero when no argument is given", () => {
    assert.equal(parseTestDelay(""), 0);
    assert.equal(parseTestDelay("   "), 0);
  });

  it("accepts a whole number of seconds", () => {
    assert.equal(parseTestDelay("5"), 5);
  });

  it("rounds fractional seconds", () => {
    assert.equal(parseTestDelay("2.6"), 3);
  });

  it("treats invalid or non-positive input as immediate", () => {
    assert.equal(parseTestDelay("abc"), 0);
    assert.equal(parseTestDelay("0"), 0);
    assert.equal(parseTestDelay("-5"), 0);
    assert.equal(parseTestDelay("Infinity"), 0);
  });

  it("clamps to the maximum delay", () => {
    assert.equal(parseTestDelay("9999"), TEST_DELAY_MAX_SECONDS);
  });
});
