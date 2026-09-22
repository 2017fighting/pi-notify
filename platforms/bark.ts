/**
 * @raincore/pi-notify — Bark notification platform
 *
 * Sends push notifications to iOS devices via a Bark server over the
 * official POST form API: POST {serverUrl}/{deviceKey} with an
 * application/x-www-form-urlencoded body of all-string parameters.
 * Supports api.day.app (default) and self-hosted bark-server instances.
 *
 * Contract notes (see .scratch/port-notify-bark/research/bark-api-contract.md):
 * - Parameter names are lowercase and identical across GET/form/JSON.
 * - `level` values are camelCase: active | passive | timeSensitive | critical.
 * - Failures are judged by HTTP status only (`response.ok`) — the server
 *   response body shape is not relied on.
 */

import type { BarkLevel } from "../types.js";

/** Default request timeout — same convention as @herbertgao/pi-bark. */
export const BARK_DEFAULT_TIMEOUT_MS = 4_000;

/** Extra Bark parameters applied to every notification. */
export interface BarkOptions {
  /** Message group name */
  group?: string;
  /** Notification icon URL (remote URL only) */
  icon?: string;
  /** Alert sound name */
  sound?: string;
  /** Interruption level (active/passive/timeSensitive/critical) */
  level?: BarkLevel;
  /** HTTP timeout in milliseconds (default: 4000) */
  timeoutMs?: number;
}

/** Send a notification to a Bark device */
export async function sendBarkNotification(
  serverUrl: string,
  deviceKey: string,
  title: string,
  message: string,
  options: BarkOptions = {}
): Promise<void> {
  const url = `${serverUrl.replace(/\/+$/, "")}/${encodeURIComponent(deviceKey)}`;

  const form = new URLSearchParams();
  form.set("title", title);
  form.set("body", message);
  if (options.group !== undefined) form.set("group", options.group);
  if (options.icon !== undefined) form.set("icon", options.icon);
  if (options.sound !== undefined) form.set("sound", options.sound);
  if (options.level !== undefined) form.set("level", options.level);

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: form.toString(),
    signal: AbortSignal.timeout(options.timeoutMs ?? BARK_DEFAULT_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(`Bark API error ${response.status}`);
  }
}
