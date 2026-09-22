import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { BarkSetupOverlay } from "../../tui/bark-setup.js";

/** Isolate HOME so loadBarkConfig sees no saved bark.json. */
function freshHome(): void {
  process.env.HOME = mkdtempSync(join(tmpdir(), "pi-notify-bark-setup-"));
}

describe("bark setup overlay: server-url step", () => {
  it("fresh install reaches the server-url step after scope selection", () => {
    freshHome();
    const overlay = new BarkSetupOverlay();
    overlay.handleInput("\r"); // instructions → scope
    overlay.handleInput("\r"); // scope (global) → server-url
    const text = overlay.render(80).join("\n");
    assert.ok(
      text.includes("Enter Bark server URL"),
      "fresh install must ask for the server URL"
    );
  });

  it("empty server URL falls back to api.day.app and proceeds to device-key", () => {
    freshHome();
    const overlay = new BarkSetupOverlay();
    overlay.handleInput("\r"); // instructions
    overlay.handleInput("\r"); // scope
    overlay.handleInput("\r"); // empty server-url → default
    const text = overlay.render(80).join("\n");
    assert.ok(text.includes("device key"), "proceeds to device-key step");
  });

  it("typed custom server URL is kept and proceeds to device-key", () => {
    freshHome();
    const overlay = new BarkSetupOverlay();
    overlay.handleInput("\r");
    overlay.handleInput("\r");
    overlay.handleInput("https://bark.example.com"); // single-chunk typing
    overlay.handleInput("\r");
    const text = overlay.render(80).join("\n");
    assert.ok(text.includes("device key"), "proceeds to device-key step");
  });

  it("esc on the server-url step closes without saving", () => {
    freshHome();
    const overlay = new BarkSetupOverlay();
    let closed = false;
    overlay.onClose = () => {
      closed = true;
    };
    overlay.handleInput("\r"); // instructions → scope
    overlay.handleInput("\r"); // scope → server-url
    overlay.handleInput("\x1b"); // legacy escape
    assert.ok(closed, "esc closes the overlay");
  });
});
