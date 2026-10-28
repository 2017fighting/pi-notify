# BEL is a routable notification platform, not an automatic prompt behaviour

pi-notify gained a terminal-bell channel. We made BEL a sixth `NotifyPlatform` — configurable per event, toggleable in `/notify:settings`, and available to `notify_user` — rather than an automatic side effect of blocking events. It sends a single `\x07` byte to stdout only when `process.stdout.isTTY` is true, treats a missing terminal as a silent success rather than a failure, and ships disabled by default.

## Considered Options

- **Automatic BEL whenever a blocking prompt appears.** Rejected: it would change behaviour on upgrade, could not be routed per event or silenced per project, and duplicated the existing event→platform routing.
- **Write to `/dev/tty` instead of stdout.** Rejected for the same reason `@juicesharp/rpiv-ask-user-question` rejected it: when a remote host renders the UI (Zed, VS Code pendant, ACP), `/dev/tty` would ring the local terminal for something the user is looking at elsewhere.
- **Write to stderr.** Rejected: it pollutes diagnostics without buying reach, and is no more or less TTY-aware than stdout.
- **Report non-TTY as a suppressed or failed delivery.** Rejected: BEL carries attention, not payload. "No terminal to ring" is the normal state in piped and RPC sessions, and surfacing it as a failure would produce permanent false alarms there.
- **Enable by default.** Rejected: an unexplained beep on install is hostile; BEL is opt-in, and enabling it joins every already-enabled event through the existing empty-`platforms` fallback.

## Consequences

- BEL has no priority, title, or body; `notify_user` priority is accepted and ignored for this platform.
- Re-notify repeats ring again, because reminders take the same dispatch path — in tmux the window flag is idempotent, so a repeat costs nothing there.
- `silenceAfterInput` applies to BEL like any other channel, with blocking events exempt as before.
- tmux is not detected or adapted to: a bell in the current window is a no-op there by design, and a bell in a background window sets the window flag that the status line renders.
