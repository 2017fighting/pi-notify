/**
 * @raincore/pi-notify — Project-level ntfy configuration
 *
 * Loads, saves, and resolves ntfy config from dedicated ntfy.json files
 * at global (~/.pi/agent/notify/ntfy.json) and project
 * (<cwd>/.pi/agent/notify/ntfy.json) scope.
 *
 * Resolution: project → global → defaults.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { dirname, join } from "path";
import { homedir } from "os";
import { NOTIFY_DIRS } from "./vendored/index.js";
import type { NtfyConfig } from "./types.js";

/** Default ntfy configuration */
const DEFAULT_NTFY_CONFIG: NtfyConfig = {
  enabled: false,
  serverUrl: "https://ntfy.sh",
  priority: 3,
};

/** Global ntfy.json path: ~/.pi/agent/notify/ntfy.json */
function getGlobalNtfyPath(): string {
  const base = NOTIFY_DIRS.CONFIG.replace("~", homedir());
  return join(base, "ntfy.json");
}

/** Project ntfy.json path: <cwd>/.pi/agent/notify/ntfy.json */
function getProjectNtfyPath(cwd: string): string {
  return join(cwd, ".pi", "agent", "notify", "ntfy.json");
}

/**
 * Read and parse a ntfy.json file.
 * Returns null if file doesn't exist (ENOENT).
 * Returns null and logs warning on parse error.
 */
function readNtfyJson(filePath: string): NtfyConfig | null {
  try {
    const raw = readFileSync(filePath, "utf-8");
    const parsed = JSON.parse(raw) as Partial<NtfyConfig>;
    return { ...DEFAULT_NTFY_CONFIG, ...parsed };
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      return null;
    }
    console.warn(`[notify] Failed to parse ${filePath}: ${(err as Error).message}. Falling back.`);
    return null;
  }
}

/**
 * Resolve ntfy config with project → global → defaults priority.
 *
 * 1. If project ntfy.json exists → use it
 * 2. If only global ntfy.json exists → use it
 * 3. If neither exists → return defaults (ntfy disabled)
 */
export function loadNtfyConfig(cwd: string): NtfyConfig {
  // Try project-level first
  const projectConfig = readNtfyJson(getProjectNtfyPath(cwd));
  if (projectConfig !== null) {
    return projectConfig;
  }

  // Try global level
  const globalConfig = readNtfyJson(getGlobalNtfyPath());
  if (globalConfig !== null) {
    return globalConfig;
  }

  // Neither exists — return defaults
  return { ...DEFAULT_NTFY_CONFIG };
}

/**
 * Save ntfy config to the chosen scope.
 * Creates parent directory if needed.
 */
export function saveNtfyConfig(
  scope: "project" | "global",
  cwd: string,
  config: NtfyConfig
): void {
  const filePath =
    scope === "project" ? getProjectNtfyPath(cwd) : getGlobalNtfyPath();
  const dir = dirname(filePath);
  mkdirSync(dir, { recursive: true });
  writeFileSync(filePath, JSON.stringify(config, null, 2) + "\n", "utf-8");
}

/**
 * Detect which scope is currently active for ntfy config.
 *
 * - "project" if project ntfy.json exists
 * - "global" if global ntfy.json exists (and no project override)
 * - "none" if neither exists
 */
export function getNtfyConfigScope(
  cwd: string
): "project" | "global" | "none" {
  if (existsSync(getProjectNtfyPath(cwd))) {
    return "project";
  }
  if (existsSync(getGlobalNtfyPath())) {
    return "global";
  }
  return "none";
}

