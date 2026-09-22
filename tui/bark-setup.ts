/**
 * @raincore/pi-notify — Bark Setup TUI Component
 *
 * Interactive overlay for setting up Bark push notifications.
 * Guides user through server URL, device key, optional group/sound,
 * and interruption level. Tests connection before saving.
 */

import type { Component } from "@earendil-works/pi-tui";
import { Key, matchesKey } from "@earendil-works/pi-tui";
import type { Theme } from "@earendil-works/pi-coding-agent";
import { sendBarkNotification } from "../platforms/bark.js";
import { loadBarkConfig, saveBarkConfig, getBarkConfigScope, DEFAULT_BARK_ICON_URL } from "../bark-config.js";
import type { BarkLevel } from "../types.js";
import { boxInnerWidth, OverlayTheme } from "../vendored/index.js";

type SetupPhase =
  | "instructions"
  | "scope"
  | "server-url"
  | "device-key"
  | "group"
  | "sound"
  | "level"
  | "testing"
  | "success"
  | "error"
  | "test-failed";

const LEVELS: BarkLevel[] = ["active", "passive", "timeSensitive", "critical"];

/**
 * Bark setup overlay component.
 */
export class BarkSetupOverlay implements Component {
  private phase: SetupPhase = "instructions";
  private scope: "global" | "project" = "global";
  private scopeIndex = 0; // 0 = global, 1 = project
  private serverUrl = "";
  private deviceKey = "";
  private group = "";
  private sound = "";
  private levelIndex = 0; // 0 = active (Bark default)
  private error: string | null = null;
  private testError: string | null = null;
  private isInPaste = false;
  private pasteBuffer = "";
  onClose?: () => void;
  requestRender?: () => void;
  private overlay = new OverlayTheme();

  constructor() {
    // Determine current scope and pre-fill from resolved config
    const cwd = process.cwd();
    const existingScope = getBarkConfigScope(cwd);
    const hadSaved = existingScope !== "none";
    if (hadSaved) {
      this.scope = existingScope;
      this.scopeIndex = existingScope === "project" ? 1 : 0;
    }
    const config = loadBarkConfig(cwd);
    // Only pre-fill the server when a saved config exists — the built-in
    // default (api.day.app) would otherwise hide the server-url step on a
    // fresh install and self-hosters would never be asked for their domain.
    if (hadSaved && config.serverUrl) this.serverUrl = config.serverUrl;
    if (config.deviceKey) this.deviceKey = config.deviceKey;
    if (config.group) this.group = config.group;
    if (config.sound) this.sound = config.sound;
    if (config.level) {
      const idx = LEVELS.indexOf(config.level);
      if (idx >= 0) this.levelIndex = idx;
    }
  }

  setTheme(theme: Theme): void {
    this.overlay.setTheme(theme);
  }

  invalidate(): void {}

  handleInput(data: string): void {
    switch (this.phase) {
      case "instructions":
        if (data === "\r" || data === " ") {
          this.phase = "scope";
        } else if (matchesKey(data, "escape")) {
          this.onClose?.();
        }
        break;

      case "scope":
        if (matchesKey(data, Key.up) || data === "k") {
          this.scopeIndex = Math.max(0, this.scopeIndex - 1);
        } else if (matchesKey(data, Key.down) || data === "j") {
          this.scopeIndex = Math.min(1, this.scopeIndex + 1);
        } else if (data === "\r" || data === " ") {
          this.scope = this.scopeIndex === 1 ? "project" : "global";
          this.phase = "server-url";
        } else if (matchesKey(data, "escape")) {
          this.onClose?.();
        }
        break;

      case "server-url":
        this.handleTextInput(data, "server-url", () => {
          if (!this.serverUrl) {
            this.serverUrl = "https://api.day.app";
          }
          this.phase = "device-key";
        });
        break;

      case "device-key":
        this.handleTextInput(data, "device-key", () => {
          if (!this.deviceKey) {
            this.error = "Device key is required — get it from the Bark app.";
            this.phase = "error";
            return;
          }
          this.phase = "group";
        });
        break;

      case "group":
        this.handleTextInput(data, "group", () => {
          this.phase = "sound";
        });
        break;

      case "sound":
        this.handleTextInput(data, "sound", () => {
          this.phase = "level";
        });
        break;

      case "level":
        if (matchesKey(data, Key.up) || data === "k") {
          this.levelIndex = Math.max(0, this.levelIndex - 1);
        } else if (matchesKey(data, Key.down) || data === "j") {
          this.levelIndex = Math.min(LEVELS.length - 1, this.levelIndex + 1);
        } else if (data === "\r" || data === " ") {
          this.testConnection();
        } else if (matchesKey(data, "escape")) {
          this.onClose?.();
        }
        break;

      case "testing":
        if (matchesKey(data, "escape")) {
          this.onClose?.();
        }
        break;

      case "success":
      case "error":
      case "test-failed":
        if (data === "\r" || data === " " || matchesKey(data, "escape")) {
          this.onClose?.();
        }
        break;
    }
  }

  private handleTextInput(
    data: string,
    target: "server-url" | "device-key" | "group" | "sound",
    onEnter: () => void
  ): void {
    // Handle bracketed paste mode
    if (this.isInPaste) {
      this.pasteBuffer += data;
      const endIndex = this.pasteBuffer.indexOf("\x1b[201~");
      if (endIndex !== -1) {
        const pasteContent = this.pasteBuffer.substring(0, endIndex).trim();
        this.assignField(target, pasteContent);
        this.isInPaste = false;
        this.pasteBuffer = "";
      }
      return;
    }
    // Detect start of bracketed paste
    if (data.includes("\x1b[200~")) {
      this.isInPaste = true;
      this.pasteBuffer = data.replace("\x1b[200~", "");
      return;
    }
    if (data === "\r") {
      onEnter();
    } else if (matchesKey(data, "escape")) {
      // Escape during optional phases — skip the field
      if (target === "group") {
        this.phase = "sound";
      } else if (target === "sound") {
        this.phase = "level";
      } else {
        this.onClose?.();
      }
    } else if (data === "\x7f" || data === "\b") {
      this.assignField(target, this.getField(target).slice(0, -1));
    } else {
      // Ignore escape sequences
      if (data.startsWith("\x1b[")) return;
      this.assignField(target, this.getField(target) + data);
    }
  }

  private getField(target: "server-url" | "device-key" | "group" | "sound"): string {
    if (target === "server-url") return this.serverUrl;
    if (target === "device-key") return this.deviceKey;
    if (target === "group") return this.group;
    return this.sound;
  }

  private assignField(target: "server-url" | "device-key" | "group" | "sound", value: string): void {
    if (target === "server-url") this.serverUrl = value;
    else if (target === "device-key") this.deviceKey = value;
    else if (target === "group") this.group = value;
    else this.sound = value;
  }

  private async testConnection(): Promise<void> {
    this.phase = "testing";
    this.requestRender?.();

    try {
      await sendBarkNotification(
        this.serverUrl.replace(/\/+$/, ""),
        this.deviceKey,
        "Pi — Setup Test",
        `Bark configured successfully at ${new Date().toLocaleTimeString()}`,
        {
          group: this.group || undefined,
          icon: DEFAULT_BARK_ICON_URL,
          sound: this.sound || undefined,
          // active (index 0) is the Bark default — omit the param
          level: this.levelIndex > 0 ? LEVELS[this.levelIndex] : undefined,
        }
      );
      this.saveConfig();
      this.phase = "success";
      this.requestRender?.();
      setTimeout(() => this.onClose?.(), 1500);
    } catch (err) {
      this.testError = err instanceof Error ? err.message : String(err);
      this.phase = "test-failed";
      this.requestRender?.();
    }
  }

  private saveConfig(): void {
    const cwd = process.cwd();
    saveBarkConfig(this.scope, cwd, {
      enabled: true,
      serverUrl: this.serverUrl.replace(/\/+$/, ""),
      deviceKey: this.deviceKey,
      group: this.group || undefined,
      sound: this.sound || undefined,
      level: this.levelIndex > 0 ? LEVELS[this.levelIndex] : undefined,
      timeoutMs: 4000,
    });
  }

  private maskKey(key: string): string {
    if (key.length <= 8) return key;
    return key.slice(0, 4) + "•".repeat(key.length - 8) + key.slice(-4);
  }

  render(width: number): string[] {
    const innerWidth = boxInnerWidth(width);
    const lines: string[] = [];

    lines.push(this.overlay.borderLine(innerWidth, "top"));
    lines.push(
      this.overlay.frameLine(
        this.overlay.fg("accent", this.overlay.bold("📱 Bark Setup")),
        innerWidth
      )
    );
    lines.push(this.overlay.ruleLine(innerWidth));

    switch (this.phase) {
      case "instructions":
        lines.push(
          this.overlay.frameLine(
            this.overlay.fg("dim", "Set up Bark push notifications (iOS):"),
            innerWidth
          )
        );
        lines.push(this.overlay.frameLine("", innerWidth));
        lines.push(
          this.overlay.frameLine(
            `  ${this.overlay.bold("1.")} Install the Bark app on your iPhone/iPad`,
            innerWidth
          )
        );
        lines.push(
          this.overlay.frameLine(
            `     ${this.overlay.fg("dim", "It gives you a device key shown in the app")}`,
            innerWidth
          )
        );
        lines.push(this.overlay.frameLine("", innerWidth));
        lines.push(
          this.overlay.frameLine(
            `  ${this.overlay.bold("2.")} Use api.day.app or your self-hosted bark-server`,
            innerWidth
          )
        );
        lines.push(this.overlay.frameLine("", innerWidth));
        lines.push(
          this.overlay.frameLine(
            `  ${this.overlay.bold("3.")} Optionally set group, sound, interruption level`,
            innerWidth
          )
        );
        if (this.serverUrl) {
          lines.push(
            this.overlay.frameLine(
              `     ${this.overlay.fg("success", "✓")} Server URL pre-filled from existing config`,
              innerWidth
            )
          );
        }
        if (this.deviceKey) {
          lines.push(
            this.overlay.frameLine(
              `     ${this.overlay.fg("success", "✓")} Device key pre-filled from existing config`,
              innerWidth
            )
          );
        }
        lines.push(this.overlay.ruleLine(innerWidth));
        lines.push(
          this.overlay.frameLine(
            this.overlay.fg("dim", "Press Enter to continue, Esc to cancel"),
            innerWidth
          )
        );
        break;

      case "scope": {
        lines.push(
          this.overlay.frameLine(
            this.overlay.fg("dim", "Where should this config be saved?"),
            innerWidth
          )
        );
        lines.push(this.overlay.frameLine("", innerWidth));
        const options = ["Global (all projects)", "Project (this project only)"];
        for (let i = 0; i < options.length; i++) {
          const isSelected = i === this.scopeIndex;
          const label = isSelected ? this.overlay.bold(options[i]) : this.overlay.fg("dim", options[i]);
          lines.push(
            this.overlay.frameLine(
              `  ${isSelected ? this.overlay.fg("accent", "▸") : " "} ${label}`,
              innerWidth
            )
          );
        }
        lines.push(this.overlay.frameLine("", innerWidth));
        lines.push(this.overlay.ruleLine(innerWidth));
        lines.push(
          this.overlay.frameLine(
            this.overlay.fg("dim", "↑↓ select · Enter confirm · Esc cancel"),
            innerWidth
          )
        );
        break;
      }

      case "server-url":
        lines.push(
          this.overlay.frameLine(
            this.overlay.fg("dim", "Enter Bark server URL:"),
            innerWidth
          )
        );
        lines.push(this.overlay.frameLine("", innerWidth));
        lines.push(
          this.overlay.frameLine(
            `  ${this.overlay.fg("accent", this.overlay.bold(this.serverUrl || " "))}${this.overlay.fg("dim", "█")}`,
            innerWidth
          )
        );
        lines.push(this.overlay.frameLine("", innerWidth));
        lines.push(
          this.overlay.frameLine(
            this.overlay.fg("dim", "Default: https://api.day.app (official)"),
            innerWidth
          )
        );
        lines.push(
          this.overlay.frameLine(
            this.overlay.fg("dim", "Leave empty and press Enter for default"),
            innerWidth
          )
        );
        lines.push(this.overlay.ruleLine(innerWidth));
        lines.push(
          this.overlay.frameLine(
            this.overlay.fg("dim", "Enter to continue · Esc to cancel"),
            innerWidth
          )
        );
        break;

      case "device-key":
        lines.push(
          this.overlay.frameLine(
            this.overlay.fg("dim", "Enter device key (from the Bark app):"),
            innerWidth
          )
        );
        lines.push(this.overlay.frameLine("", innerWidth));
        lines.push(
          this.overlay.frameLine(
            `  ${this.overlay.fg("accent", this.overlay.bold(this.deviceKey || " "))}${this.overlay.fg("dim", "█")}`,
            innerWidth
          )
        );
        lines.push(this.overlay.frameLine("", innerWidth));
        lines.push(
          this.overlay.frameLine(
            this.overlay.fg("dim", "The path segment of the URL shown in the Bark app"),
            innerWidth
          )
        );
        lines.push(
          this.overlay.frameLine(
            this.overlay.fg("dim", "e.g. https://api.day.app/<deviceKey>"),
            innerWidth
          )
        );
        lines.push(this.overlay.ruleLine(innerWidth));
        lines.push(
          this.overlay.frameLine(
            this.overlay.fg("dim", "Enter to continue · Esc to cancel"),
            innerWidth
          )
        );
        break;

      case "group":
        lines.push(
          this.overlay.frameLine(
            this.overlay.fg("dim", "Enter message group (optional):"),
            innerWidth
          )
        );
        lines.push(this.overlay.frameLine("", innerWidth));
        lines.push(
          this.overlay.frameLine(
            `  ${this.overlay.fg("accent", this.overlay.bold(this.group || " "))}${this.overlay.fg("dim", "█")}`,
            innerWidth
          )
        );
        lines.push(this.overlay.frameLine("", innerWidth));
        lines.push(
          this.overlay.frameLine(
            this.overlay.fg("dim", "Messages with the same group fold together, e.g. pi"),
            innerWidth
          )
        );
        lines.push(this.overlay.ruleLine(innerWidth));
        lines.push(
          this.overlay.frameLine(
            this.overlay.fg("dim", "Enter to continue · Esc to skip"),
            innerWidth
          )
        );
        break;

      case "sound":
        lines.push(
          this.overlay.frameLine(
            this.overlay.fg("dim", "Enter alert sound (optional):"),
            innerWidth
          )
        );
        lines.push(this.overlay.frameLine("", innerWidth));
        lines.push(
          this.overlay.frameLine(
            `  ${this.overlay.fg("accent", this.overlay.bold(this.sound || " "))}${this.overlay.fg("dim", "█")}`,
            innerWidth
          )
        );
        lines.push(this.overlay.frameLine("", innerWidth));
        lines.push(
          this.overlay.frameLine(
            this.overlay.fg("dim", "Built-in or imported sound name, e.g. minuet"),
            innerWidth
          )
        );
        lines.push(this.overlay.ruleLine(innerWidth));
        lines.push(
          this.overlay.frameLine(
            this.overlay.fg("dim", "Enter to continue · Esc to skip"),
            innerWidth
          )
        );
        break;

      case "level": {
        lines.push(
          this.overlay.frameLine(
            this.overlay.fg("dim", "Choose interruption level:"),
            innerWidth
          )
        );
        lines.push(this.overlay.frameLine("", innerWidth));
        const hints = [
          "default banner",
          "notification list only, no banner",
          "breaks through Focus modes",
          "rings even when muted (needs in-app entitlement)",
        ];
        for (let i = 0; i < LEVELS.length; i++) {
          const isSelected = i === this.levelIndex;
          const label = isSelected
            ? this.overlay.bold(LEVELS[i])
            : this.overlay.fg("dim", LEVELS[i]);
          lines.push(
            this.overlay.frameLine(
              `  ${isSelected ? this.overlay.fg("accent", "▸") : " "} ${label}  ${this.overlay.fg("dim", hints[i])}`,
              innerWidth
            )
          );
        }
        lines.push(this.overlay.frameLine("", innerWidth));
        lines.push(
          this.overlay.frameLine(
            this.overlay.fg("dim", "Semantic priority maps: low→passive · normal→active · high→timeSensitive"),
            innerWidth
          )
        );
        lines.push(this.overlay.ruleLine(innerWidth));
        lines.push(
          this.overlay.frameLine(
            this.overlay.fg("dim", "↑↓ select · Enter to test connection · Esc cancel"),
            innerWidth
          )
        );
        break;
      }

      case "testing":
        lines.push(this.overlay.frameLine("", innerWidth));
        lines.push(
          this.overlay.frameLine(
            `  ${this.overlay.fg("accent", "⠋")} ${this.overlay.bold("Testing connection...")}`,
            innerWidth
          )
        );
        lines.push(this.overlay.frameLine("", innerWidth));
        lines.push(
          this.overlay.frameLine(
            `  ${this.overlay.fg("dim", `Sending test to ${this.serverUrl}/${this.maskKey(this.deviceKey)}`)}`,
            innerWidth
          )
        );
        lines.push(this.overlay.ruleLine(innerWidth));
        lines.push(
          this.overlay.frameLine(
            this.overlay.fg("dim", "Esc to cancel"),
            innerWidth
          )
        );
        break;

      case "success":
        lines.push(this.overlay.frameLine("", innerWidth));
        lines.push(
          this.overlay.frameLine(
            `  ${this.overlay.fg("success", "✓ Bark configured successfully!")}`,
            innerWidth
          )
        );
        lines.push(this.overlay.frameLine("", innerWidth));
        lines.push(
          this.overlay.frameLine(
            `  ${this.overlay.fg("dim", `Server: ${this.serverUrl}`)}`,
            innerWidth
          )
        );
        lines.push(
          this.overlay.frameLine(
            `  ${this.overlay.fg("dim", `Device key: ${this.maskKey(this.deviceKey)}`)}`,
            innerWidth
          )
        );
        lines.push(
          this.overlay.frameLine(
            `  ${this.overlay.fg("dim", `Level: ${LEVELS[this.levelIndex]}`)}`,
            innerWidth
          )
        );
        lines.push(this.overlay.ruleLine(innerWidth));
        lines.push(
          this.overlay.frameLine(
            this.overlay.fg("dim", "Closing..."),
            innerWidth
          )
        );
        break;

      case "test-failed":
        lines.push(this.overlay.frameLine("", innerWidth));
        lines.push(
          this.overlay.frameLine(
            `  ${this.overlay.fg("error", "✗ Connection test failed")}`,
            innerWidth
          )
        );
        lines.push(this.overlay.frameLine("", innerWidth));
        lines.push(
          this.overlay.frameLine(
            `  ${this.overlay.fg("dim", this.testError || "Unknown error")}`,
            innerWidth
          )
        );
        lines.push(this.overlay.frameLine("", innerWidth));
        lines.push(
          this.overlay.frameLine(
            `  ${this.overlay.fg("dim", "Check your server URL and device key")}`,
            innerWidth
          )
        );
        lines.push(this.overlay.ruleLine(innerWidth));
        lines.push(
          this.overlay.frameLine(
            this.overlay.fg("dim", "Press Enter to close"),
            innerWidth
          )
        );
        break;

      case "error":
        lines.push(this.overlay.frameLine("", innerWidth));
        lines.push(
          this.overlay.frameLine(
            `  ${this.overlay.fg("error", "✗ Setup failed")}`,
            innerWidth
          )
        );
        lines.push(this.overlay.frameLine("", innerWidth));
        lines.push(
          this.overlay.frameLine(
            `  ${this.overlay.fg("dim", this.error || "Unknown error")}`,
            innerWidth
          )
        );
        lines.push(this.overlay.ruleLine(innerWidth));
        lines.push(
          this.overlay.frameLine(
            this.overlay.fg("dim", "Press Enter to close"),
            innerWidth
          )
        );
        break;
    }

    lines.push(this.overlay.borderLine(innerWidth, "bottom"));
    return lines;
  }
}
