/**
 * Vendored from @pi-unipi/core `tui-width.ts` (v2.20.5) — trimmed to the
 * width helpers pi-notify's overlays use. See ./NOTICE.md for attribution.
 *
 * Pure arithmetic so this module stays free of a pi-tui dependency.
 */

/** Smallest width any layout is asked to cope with. */
export const MIN_RENDER_WIDTH = 1;

/**
 * Normalize an incoming render width. Guards against `0`, negative, `NaN`
 * and fractional widths, all of which have been observed during terminal
 * resize races.
 */
export function normalizeWidth(width: number): number {
  if (!Number.isFinite(width)) return MIN_RENDER_WIDTH;
  return Math.max(MIN_RENDER_WIDTH, Math.floor(width));
}

/**
 * Content width inside a bordered box, i.e. the terminal width minus the two
 * border columns, so that `│ + content + │` is `<= width`.
 */
export function boxInnerWidth(width: number): number {
  return Math.max(1, normalizeWidth(width) - 2);
}

/**
 * Clamp a repeat count to a non-negative integer.
 *
 * `String.prototype.repeat` throws `RangeError: Invalid count value` for
 * negative counts, which crashes the render pass.
 */
export function safeRepeatCount(count: number): number {
  if (!Number.isFinite(count)) return 0;
  return Math.max(0, Math.floor(count));
}

/** `" ".repeat(n)` that cannot throw. */
export function safeRepeat(char: string, count: number): string {
  return char.repeat(safeRepeatCount(count));
}
