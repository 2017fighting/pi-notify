import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { sendBarkNotification } from "../../platforms/bark.js";

/** Captured fetch calls for assertions. */
interface CapturedCall {
  url: string;
  method: string;
  contentType: string;
  body: URLSearchParams;
  signal: AbortSignal | undefined;
}

describe("platforms/bark", () => {
  const calls: CapturedCall[] = [];
  let failWith = 0;
  const realFetch = globalThis.fetch;

  before(() => {
    globalThis.fetch = (async (input: unknown, init?: RequestInit) => {
      calls.push({
        url: String(input),
        method: init?.method ?? "GET",
        contentType: (init?.headers as Record<string, string>)?.["Content-Type"] ?? "",
        body: new URLSearchParams(String(init?.body ?? "")),
        signal: init?.signal ?? undefined,
      });
      if (failWith) {
        return new Response("boom", { status: failWith, statusText: "error" });
      }
      return new Response('{"code":200}', { status: 200 });
    }) as typeof fetch;
  });

  after(() => {
    globalThis.fetch = realFetch;
  });

  it("POSTs form-encoded to {serverUrl}/{deviceKey}", async () => {
    calls.length = 0;
    await sendBarkNotification("https://api.day.app", "abc123", "T", "M");
    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, "https://api.day.app/abc123");
    assert.equal(calls[0].method, "POST");
    assert.equal(calls[0].contentType, "application/x-www-form-urlencoded");
    assert.equal(calls[0].body.get("title"), "T");
    assert.equal(calls[0].body.get("body"), "M");
  });

  it("strips trailing slashes from serverUrl and URL-encodes the device key", async () => {
    calls.length = 0;
    await sendBarkNotification("https://bark.example.com/", "k/with spaces", "T", "M");
    assert.equal(
      calls[0].url,
      "https://bark.example.com/" + encodeURIComponent("k/with spaces")
    );
  });

  it("sends group/icon/sound/level only when defined", async () => {
    calls.length = 0;
    await sendBarkNotification("https://api.day.app", "k", "T", "M", {
      group: "pi",
      icon: "https://example.com/i.png",
      sound: "minuet",
      level: "timeSensitive",
    });
    assert.equal(calls[0].body.get("group"), "pi");
    assert.equal(calls[0].body.get("icon"), "https://example.com/i.png");
    assert.equal(calls[0].body.get("sound"), "minuet");
    assert.equal(calls[0].body.get("level"), "timeSensitive");

    calls.length = 0;
    await sendBarkNotification("https://api.day.app", "k", "T", "M");
    assert.equal(calls[0].body.has("group"), false);
    assert.equal(calls[0].body.has("icon"), false);
    assert.equal(calls[0].body.has("sound"), false);
    assert.equal(calls[0].body.has("level"), false);
  });

  it("uses an abort signal with a timeout", async () => {
    calls.length = 0;
    await sendBarkNotification("https://api.day.app", "k", "T", "M", { timeoutMs: 1234 });
    assert.ok(calls[0].signal instanceof AbortSignal);
    assert.equal(calls[0].signal!.aborted, false);
  });

  it("throws on non-2xx without parsing the body", async () => {
    calls.length = 0;
    failWith = 404;
    try {
      await assert.rejects(
        () => sendBarkNotification("https://api.day.app", "bad", "T", "M"),
        /Bark API error 404/
      );
    } finally {
      failWith = 0;
    }
  });
});
