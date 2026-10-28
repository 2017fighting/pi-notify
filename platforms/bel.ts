/**
 * @raincore/pi-notify — BEL notification platform
 *
 * Rings the terminal bell: writes the ASCII bell byte (0x07) to stdout.
 * What the bell becomes is the terminal's decision — an audible beep, a
 * visual flash, a tmux window flag in the status line, or nothing at all.
 *
 * Contract notes (same reasoning as @juicesharp/rpiv-ask-user-question's
 * terminal attention signal):
 * - `process.stdout.isTTY` gates the write. It proves an interactive
 *   terminal owns the output and keeps the byte out of redirected output
 *   and piped RPC transports (VS Code pendant, Zed, ACP hosts).
 * - Deliberately not `/dev/tty`: that would ring a terminal even when the
 *   notification is rendered by a remote host's own UI.
 * - Best effort: a terminal that fails to accept the byte never fails the
 *   dispatch. No interactive terminal means "nothing to ring", not an error.
 */

/** The ASCII bell control byte. */
export const BEL_SIGNAL = "\x07";

/** Whether stdout is an interactive terminal that can receive a bell. */
export function isBellCapable(): boolean {
  return process.stdout.isTTY === true;
}

/**
 * Emit one terminal bell.
 *
 * Returns true when the byte was written, false when there is no interactive
 * terminal or the write failed. Both are success from the dispatch's point
 * of view — BEL is attention, not delivery.
 */
export function sendBelNotification(): boolean {
  if (!isBellCapable()) return false;
  try {
    process.stdout.write(BEL_SIGNAL);
    return true;
  } catch {
    // Terminal attention is best effort; notification dispatch must proceed.
    return false;
  }
}
