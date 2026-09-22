# @raincore/pi-notify

Push notifications when things happen. Workflow finishes, Ralph loop completes, MCP server errors — notify sends alerts to native OS, Gotify, Telegram, ntfy, or **Bark** (iOS).

Configure once, get alerts everywhere. Per-event platform routing lets you send critical errors to Telegram and routine completions to Bark. Native desktop notifications can also be suppressed while the Pi window is focused.

> Ported from [`@pi-unipi/notify`](https://github.com/Neuron-Mr-White/unipi) (v2.20.5) as a standalone, de-branded package with zero UniPi dependencies — shared helpers are vendored under `vendored/` (see `vendored/NOTICE.md`). Bark platform added; command prefix is `/notify:*` and config lives in `~/.pi/agent/notify/`.

## Commands

| Command | Description |
|---------|-------------|
| `/notify:settings` | Open settings overlay to configure platforms and events |
| `/notify:set-gotify` | Configure Gotify server connection |
| `/notify:set-tg` | Interactive Telegram bot setup |
| `/notify:set-ntfy` | Configure ntfy topic and server |
| `/notify:set-bark` | Interactive Bark setup (server, device key, group, sound, level) |
| `/notify:recap-model` | Set model for notification recaps |
| `/notify:event` | Toggle a single event without the TUI (`<event> <on\|off>`) — reports the new value; run `/reload` to re-register listeners |
| `/notify:test` | Send test notification to all enabled platforms |

## Special Triggers

Notify subscribes to Pi lifecycle events and routes notifications based on your config:

| Event | Default | Description |
|-------|---------|-------------|
| `workflow_end` | On | Workflow command completes |
| `ralph_loop_end` | On | Ralph loop completes |
| `mcp_server_error` | On | MCP server error |
| `agent_end` | Off | Low-level agent run ends (may fire again on retries) |
| `agent_settled` | Off | Agent fully settles after retries, compaction, and queued continuations |
| `memory_consolidated` | Off | Memory auto-saved |
| `session_shutdown` | Off | Session ends |
| `ask_user_prompt` | Off | Agent asked a question and is waiting for an answer |
| `permission_request` | Off | A permission prompt is about to be shown (requires [`@gotgenes/pi-permission-system`](https://www.npmjs.com/package/@gotgenes/pi-permission-system)) |

`ask_user_prompt` and `permission_request` are **blocking** events: while one is unanswered the agent is parked, so notify re-sends it periodically (see [Re-notify unanswered prompts](#re-notify-unanswered-prompts)).

The `unipi:*` EventBus channel names are kept from upstream on purpose, so pi-notify still hears events emitted by UniPi-family modules (workflow, ralph, mcp, memory, ask-user) if you run them alongside.

## Agent Tool

| Tool | Description |
|------|-------------|
| `notify_user` | Send cross-platform notification |

```
notify_user({
  title: "Build Failed",
  message: "TypeScript compilation failed with 12 errors.",
  priority: "high"
})
```

An explicit semantic priority overrides configured urgency for that dispatch on platforms that support it: `low`/`normal`/`high` map to Gotify `2`/`5`/`8`, ntfy `2`/`3`/`5`, and Bark `passive`/`active`/`timeSensitive`. Native and Telegram have no priority input and ignore it. When omitted, Gotify and ntfy retain their configured numeric priorities, and Bark sends no `level` (Bark's own default is `active`).

## Platforms

### Native OS

Desktop notifications via [node-notifier](https://github.com/mikaelbr/node-notifier):
- **Windows:** SnoreToast (no admin required)
- **macOS:** terminal-notifier
- **Linux:** notify-send / libnotify

Zero configuration — works out of the box. Set `native.suppressWhenFocused` to `true` to skip native notifications when the active/focused window is already Pi.

### Silence after input

After a terminal keypress, listed platforms stay quiet for `windowMs`. Default: **off**, native only, 10s. Edit in `/notify:settings` → Platforms (Quiet after activity + channel chips), or in `~/.pi/agent/notify/config.json`:

```json
{
  "silenceAfterInput": {
    "enabled": true,
    "windowMs": 10000,
    "platforms": ["native"]
  }
}
```

Add `gotify`, `telegram`, `ntfy`, or `bark` to `platforms` to silence those channels too. Empty `platforms` silences all enabled platforms (same as `events.*.platforms`). Blocking events (`ask_user_prompt`, `permission_request`) are never silenced — see below.

### Re-notify unanswered prompts

When a blocking prompt (`ask_user_prompt`, `permission_request`) is not answered, notify re-sends the same notification every `intervalMs`, with the title suffixed `(still waiting)` and priority `high`, up to `maxRepeats` times. Default: **on**, every 2 minutes, 3 repeats. This is the one notify case where missing the push leaves the agent parked indefinitely.

```json
{
  "renotify": {
    "enabled": true,
    "intervalMs": 120000,
    "maxRepeats": 3
  }
}
```

`maxRepeats: 0` sends the initial notification only. Reminders stop as soon as any of these fires: the user presses a key, herdr reports `herdr:blocked` `active: false`, the agent starts a new turn (`agent_start`), or the session ends. Only one prompt can be outstanding at a time — arming a new one replaces the previous reminder. Reminders bypass `silenceAfterInput` because blocking events are exempt from it.

Edit in `/notify:settings` → Re-notify, or in `~/.pi/agent/notify/config.json`.

### Gotify

Self-hosted push notification server:

```json
{
  "gotify": {
    "enabled": true,
    "serverUrl": "https://your-gotify-server.com",
    "appToken": "your-app-token",
    "priority": 5
  }
}
```

### Telegram

Bot API notifications. Run `/notify:set-tg` for interactive setup:
1. Create a bot via @BotFather
2. Paste the bot token
3. Auto-detect your chat ID

### ntfy

HTTP-based pub-sub notifications via [ntfy.sh](https://ntfy.sh) or self-hosted. Configured in a dedicated `ntfy.json` (global `~/.pi/agent/notify/ntfy.json` or project `<project>/.pi/agent/notify/ntfy.json`; project wins):

```json
{
  "enabled": true,
  "serverUrl": "https://ntfy.sh",
  "topic": "your-topic-name",
  "priority": 3
}
```

Run `/notify:set-ntfy` for guided setup with scope selection and a connection test.

### Bark

iOS push notifications via the official [Bark](https://github.com/Finb/Bark) app — api.day.app (default) or a self-hosted bark-server. Run `/notify:set-bark` for guided setup (scope, server URL, device key, optional group/sound, interruption level) with a connection test.

Configured in a dedicated `bark.json` (global `~/.pi/agent/notify/bark.json` or project `<project>/.pi/agent/notify/bark.json`; project wins):

```json
{
  "enabled": true,
  "serverUrl": "https://api.day.app",
  "deviceKey": "your-device-key",
  "group": "pi",
  "sound": "minuet",
  "timeoutMs": 4000
}
```

Notes:

- **Device key** is the path segment of the URL shown in the Bark app (`https://api.day.app/<deviceKey>`). Keep `bark.json` private.
- **Icon:** notifications default to the Pi badge (`assets/pi-icon.png`, served from this repo via raw.githubusercontent.com). Bark only accepts remote image URLs and caches each URL once — override with your own URL via `icon`. An explicit `icon` always wins.
- **Level:** `active` (default, banner), `passive` (notification list only), `timeSensitive` (breaks through Focus), `critical` (rings even muted; needs the entitlement enabled in the Bark app). When `level` is set it wins over the semantic priority mapping; when unset, `notify_user`'s `priority` maps low/normal/high → passive/active/timeSensitive, and plain event dispatches send no level (Bark default `active`).
- **Params:** title/body are always the event's; other Bark parameters (markdown, image, badge, url/copy/action, encryption, batch keys) are intentionally out of scope.

## Configurables

Settings stored at `~/.pi/agent/notify/config.json` (ntfy and Bark in their sibling `ntfy.json`/`bark.json`). Edit via `/notify:settings` or manual JSON editing.

Per-event platform routing lets you control where each event type goes. The settings overlay shows all events with platform toggles.

### Recap (thinking models)

Recap summarizes the last assistant message into a one-line push notification (100-token budget). Thinking models served by llama.cpp or vLLM can spend that entire budget on reasoning and return nothing, falling back to a plain 100-character truncation. If your recap endpoint supports chat-template kwargs, set `recap.disableThinking` to skip reasoning tokens:

```json
{
  "recap": {
    "enabled": true,
    "model": "localhost/gemma-4-e4b",
    "disableThinking": true
  }
}
```

This sends `chat_template_kwargs: { enable_thinking: false, preserve_thinking: false }` with the request. Keep it `false` (the default) for strict OpenAI-compatible endpoints — they reject unknown params. Anthropic models are unaffected (thinking is opt-in there).

## License

MIT — ported from [`@pi-unipi/notify`](https://github.com/Neuron-Mr-White/unipi) by Neuron Mr White (see `vendored/NOTICE.md`).
