/**
 * Vendored from @pi-unipi/core `events.ts` (v2.20.5) — the full UNIPI_EVENTS
 * constant, unchanged. See ./NOTICE.md for attribution.
 *
 * Event-name VALUES are kept identical to upstream ("unipi:*") on purpose:
 * they are EventBus channel names shared with other UniPi-family modules
 * (workflow, ralph, mcp, memory, ask-user). Keeping them lets pi-notify
 * interoperate with those modules when both are installed.
 */

/** Event names emitted by unipi modules */
export const UNIPI_EVENTS = {
  /** Module loaded and ready */
  MODULE_READY: "unipi:module:ready",

  /** Workflow command started */
  WORKFLOW_START: "unipi:workflow:start",
  /** Workflow command ended */
  WORKFLOW_END: "unipi:workflow:end",

  /** Ralph loop started */
  RALPH_LOOP_START: "unipi:ralph:loop:start",
  /** Ralph loop ended */
  RALPH_LOOP_END: "unipi:ralph:loop:end",
  /** Ralph loop iteration completed */
  RALPH_ITERATION_DONE: "unipi:ralph:loop:iteration:done",

  /** Memory consolidation completed */
  MEMORY_CONSOLIDATED: "unipi:memory:consolidated",

  /** MCP server error */
  MCP_SERVER_ERROR: "unipi:mcp:server:error",

  /** Notification sent */
  NOTIFICATION_SENT: "unipi:notify:sent",

  /** Agent asked user a question (ask_user tool invoked) */
  ASK_USER_PROMPT: "unipi:ask-user:prompt",
} as const;
