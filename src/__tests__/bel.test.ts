/**
 * Tests for the BEL (terminal bell) platform.
 *
 * The byte always goes to stdout, gated on `process.stdout.isTTY`, and a
 * failed write is never a dispatch failure (see platforms/bel.ts).
 */

import { afterEach, describe, it } from "node:test";
import assert from "node:assert/strict";

import { BEL_SIGNAL, isBellCapable, sendBelNotification } from "../../platforms/bel.ts";
import { dispatchNotification } from "../../events.ts";
import { DEFAULT_CONFIG } from "../../settings.ts";
import type { NotifyConfig } from "../../types.ts";

const realWrite = process.stdout.write;
const realIsTTY = process.stdout.isTTY;

/** Replace stdout with a recorder; returns every chunk written. */
function stubTerminal(
  isTTY: boolean | undefined,
  opts: { throwOnWrite?: boolean } = {},
): string[] {
  const writes: string[] = [];
  Object.defineProperty(process.stdout, "isTTY", {
    configurable: true,
    value: isTTY,
  });
  process.stdout.write = ((chunk: unknown) => {
    if (opts.throwOnWrite) throw new Error("terminal write failed");
    writes.push(String(chunk));
    return true;
  }) as typeof process.stdout.write;
  return writes;
}

afterEach(() => {
  process.stdout.write = realWrite;
  Object.defineProperty(process.stdout, "isTTY", {
    configurable: true,
    value: realIsTTY,
  });
});

function belConfig(enabled: boolean): NotifyConfig {
  const config = structuredClone(DEFAULT_CONFIG);
  config.bel.enabled = enabled;
  return config;
}

function fakePi() {
  return { events: { emit: () => {} } } as unknown as Parameters<
    typeof dispatchNotification
  >[0];
}

describe("platforms/bel", () => {
  it("BEL_SIGNAL is the ASCII bell byte", () => {
    assert.equal(BEL_SIGNAL, "\x07");
    assert.equal(BEL_SIGNAL.charCodeAt(0), 7);
  });

  it("writes exactly one bell to an interactive terminal", () => {
    const writes = stubTerminal(true);
    assert.equal(isBellCapable(), true);
    assert.equal(sendBelNotification(), true);
    assert.deepEqual(writes, ["\x07"]);
  });

  it("writes nothing outside a TTY", () => {
    const writes = stubTerminal(undefined);
    assert.equal(isBellCapable(), false);
    assert.equal(sendBelNotification(), false);
    assert.deepEqual(writes, []);
  });

  it("treats a failing terminal write as best-effort", () => {
    stubTerminal(true, { throwOnWrite: true });
    assert.doesNotThrow(() => sendBelNotification());
    assert.equal(sendBelNotification(), false);
  });
});

describe("dispatch: bel platform", () => {
  it("rings once when enabled", async () => {
    const writes = stubTerminal(true);
    const result = await dispatchNotification(
      fakePi(),
      "Title",
      "Body",
      ["bel"],
      "agent_tool",
      belConfig(true),
      process.cwd(),
    );
    assert.deepEqual(writes, ["\x07"]);
    assert.deepEqual(result.results, [{ platform: "bel", success: true }]);
    assert.equal(result.allSuccess, true);
  });

  it("does not ring when disabled", async () => {
    const writes = stubTerminal(true);
    const result = await dispatchNotification(
      fakePi(),
      "Title",
      "Body",
      ["bel"],
      "agent_tool",
      belConfig(false),
      process.cwd(),
    );
    assert.deepEqual(writes, []);
    assert.deepEqual(result.results, []);
  });

  it("still reports success without a TTY", async () => {
    const writes = stubTerminal(undefined);
    const result = await dispatchNotification(
      fakePi(),
      "Title",
      "Body",
      ["bel"],
      "agent_tool",
      belConfig(true),
      process.cwd(),
    );
    assert.deepEqual(writes, []);
    assert.deepEqual(result.results, [{ platform: "bel", success: true }]);
  });
});
