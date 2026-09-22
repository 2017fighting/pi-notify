import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mapNotifyPriority, mapBarkLevel } from "../events.js";

describe("notify_user priority mapping", () => {
  it("maps semantic priorities to Gotify's configured scale", () => {
    assert.equal(mapNotifyPriority("gotify", "low"), 2);
    assert.equal(mapNotifyPriority("gotify", "normal"), 5);
    assert.equal(mapNotifyPriority("gotify", "high"), 8);
  });

  it("maps semantic priorities to ntfy's standard scale", () => {
    assert.equal(mapNotifyPriority("ntfy", "low"), 2);
    assert.equal(mapNotifyPriority("ntfy", "normal"), 3);
    assert.equal(mapNotifyPriority("ntfy", "high"), 5);
  });

  it("maps semantic priorities to Bark interruption levels", () => {
    assert.equal(mapBarkLevel("low"), "passive");
    assert.equal(mapBarkLevel("normal"), "active");
    assert.equal(mapBarkLevel("high"), "timeSensitive");
  });
});
