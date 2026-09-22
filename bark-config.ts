/**
 * @raincore/pi-notify — Project-level Bark configuration
 *
 * Loads, saves, and resolves Bark config from dedicated bark.json files
 * at global (~/.pi/agent/notify/bark.json) and project
 * (<cwd>/.pi/agent/notify/bark.json) scope.
 *
 * Resolution: project → global → defaults.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { dirname, join } from "path";
import { homedir } from "os";
import { NOTIFY_DIRS } from "./vendored/index.js";
import type { BarkConfig } from "./types.js";

/**
 * Default notification icon — the bundled Pi badge, hosted on this repo.
 * Bark only accepts remote URLs (iOS 15+, cached by URL), so the asset is
 * served from GitHub raw. Users can override with their own URL.
 */
export const DEFAULT_BARK_ICON_URL =
  "https://raw.githubusercontent.com/2017fighting/pi-notify/main/assets/pi-icon.png";

/** Default Bark configuration */
const DEFAULT_BARK_CONFIG: BarkConfig = {
  enabled: false,
  serverUrl: "https://api.day.app",
  timeoutMs: 4000,
};

/** Global bark.json path: ~/.pi/agent/notify/bark.json */
function getGlobalBarkPath(): string {
  const base = NOTIFY_DIRS.CONFIG.replace("~", homedir());
  return join(base, "bark.json");
}

/** Project bark.json path: <cwd>/.pi/agent/notify/bark.json */
function getProjectBarkPath(cwd: string): string {
  return join(cwd, ".pi", "agent", "notify", "bark.json");
}

/**
 * Read and parse a bark.json file.
 * Returns null if file doesn't exist (ENOENT).
 * Returns null and logs warning on parse error.
 */
function readBarkJson(filePath: string): BarkConfig | null {
  try {
    const raw = readFileSync(filePath, "utf-8");
    const parsed = JSON.parse(raw) as Partial<BarkConfig>;
    return { ...DEFAULT_BARK_CONFIG, ...parsed };
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      return null;
    }
    console.warn(`[notify] Failed to parse ${filePath}: ${(err as Error).message}. Falling back.`);
    return null;
  }
}

/**
 * Resolve Bark config with project → global → defaults priority.
 *
 * 1. If project bark.json exists → use it
 * 2. If only global bark.json exists → use it
 * 3. If neither exists → return defaults (Bark disabled)
 */
export function loadBarkConfig(cwd: string): BarkConfig {
  // Try project-level first
  const projectConfig = readBarkJson(getProjectBarkPath(cwd));
  if (projectConfig !== null) {
    return projectConfig;
  }

  // Try global level
  const globalConfig = readBarkJson(getGlobalBarkPath());
  if (globalConfig !== null) {
    return globalConfig;
  }

  // Neither exists — return defaults
  return { ...DEFAULT_BARK_CONFIG };
}

/**
 * Save Bark config to the chosen scope.
 * Creates parent directory if needed.
 */
export function saveBarkConfig(
  scope: "project" | "global",
  cwd: string,
  config: BarkConfig
): void {
  const filePath =
    scope === "project" ? getProjectBarkPath(cwd) : getGlobalBarkPath();
  const dir = dirname(filePath);
  mkdirSync(dir, { recursive: true });
  writeFileSync(filePath, JSON.stringify(config, null, 2) + "\n", "utf-8");
}

/**
 * Detect which scope is currently active for Bark config.
 *
 * - "project" if project bark.json exists
 * - "global" if global bark.json exists (and no project override)
 * - "none" if neither exists
 */
export function getBarkConfigScope(
  cwd: string
): "project" | "global" | "none" {
  if (existsSync(getProjectBarkPath(cwd))) {
    return "project";
  }
  if (existsSync(getGlobalBarkPath())) {
    return "global";
  }
  return "none";
}
