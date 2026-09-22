/**
 * Vendored from @pi-unipi/core `constants.ts` (v2.20.5) — trimmed to the
 * symbols pi-notify imports. See ./NOTICE.md for attribution.
 *
 * Values re-branded for pi-notify (upstream → here):
 *   UNIPI_PREFIX   "unipi:"             → "notify:"
 *   MODULES.NOTIFY "@pi-unipi/notify"   → "@raincore/pi-notify"
 *   NOTIFY_DIRS.CONFIG "~/.unipi/config/notify" → "~/.pi/agent/notify"
 * Command names drop their "notify-" prefix since UNIPI_PREFIX already
 * carries it: /notify:settings, /notify:set-bark, /notify:test, ...
 * SET_BARK is a pi-notify addition (no upstream counterpart).
 */

/** Prefix for all notify commands */
export const UNIPI_PREFIX = "notify:" as const;

/** Module names (trimmed to the one pi-notify announces) */
export const MODULES = {
  NOTIFY: "@raincore/pi-notify",
} as const;

/** Notify command names */
export const NOTIFY_COMMANDS = {
  SETTINGS: "settings",
  SET_GOTIFY: "set-gotify",
  SET_TG: "set-tg",
  SET_NTFY: "set-ntfy",
  SET_BARK: "set-bark",
  TEST: "test",
  RECAP_MODEL: "recap-model",
  NOTIFY_EVENT: "event",
} as const;

/** Notify tool names */
export const NOTIFY_TOOLS = {
  NOTIFY_USER: "notify_user",
} as const;

/** Notify directory paths */
export const NOTIFY_DIRS = {
  CONFIG: "~/.pi/agent/notify",
} as const;
