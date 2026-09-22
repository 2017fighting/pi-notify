/**
 * Vendored from @pi-unipi/core `utils.ts` (v2.20.5) — trimmed to
 * tryRead/readJson/getPackageVersion/emitEvent. See ./NOTICE.md.
 */

import * as fs from "node:fs";
import * as path from "node:path";

/** Read a file, return null on error. */
export function tryRead(filePath: string): string | null {
  try {
    return fs.readFileSync(filePath, "utf-8");
  } catch {
    return null;
  }
}

/** Read JSON file, return null on error. */
export function readJson<T>(filePath: string): T | null {
  const content = tryRead(filePath);
  if (!content) return null;
  try {
    return JSON.parse(content) as T;
  } catch {
    return null;
  }
}

/** Get package version from package.json. */
export function getPackageVersion(packageDir: string): string {
  const pkgPath = path.join(packageDir, "package.json");
  const pkg = readJson<{ version?: string }>(pkgPath);
  return pkg?.version ?? "0.0.0";
}

/**
 * Emit a unipi event via pi.events (safe wrapper).
 * Returns true if event was emitted.
 */
export function emitEvent(
  pi: { events: { emit: (name: string, payload: unknown) => void } },
  eventName: string,
  payload: unknown,
): boolean {
  try {
    pi.events.emit(eventName, payload);
    return true;
  } catch {
    return false;
  }
}
