# pi 0.84 → 0.86.1 兼容性核查（notify 触面）

研究票：`issues/02-pi-086-compat.md`。方法：由于本机 0.86.1 是 aqua 原生二进制安装（`/root/.local/share/mise/installs/pi/0.86.1/pi/` 内无 dist/.d.ts），改从 npm registry 下载对照包：`@earendil-works/pi-coding-agent` 0.84.4 vs 0.86.1、`@earendil-works/pi-tui` 0.84.4 vs 0.86.1（tgz 解包于 /tmp/picomp/）。notify 源码以 /root/clone/UniPi/packages/notify 为准（只读）。

## 结论速览

1. **notify 用到的全部 pi API 在 0.86.1 中签名均未破坏性变化** —— `ExtensionAPI.on/registerTool/registerCommand/events`、`ExtensionContext`（ui.notify/ui.custom/ui.onTerminalInput/hasUI/modelRegistry/cwd）、`ToolDefinition.execute`、`EventBus` 全部逐字段 diff 相同或仅增不改。
2. **唯一 API 签名变化**：0.86.0 起 `pi.on()` 返回 unsubscribe 函数（原返回 `void`），纯增强，notify 未用返回值，零影响（pi-coding-agent 0.86.1 CHANGELOG "Added an unsubscribe function from `pi.on()`"，#8967）。
3. **生命周期事件名无增删改名**（对 notify 而言）：`session_start`、`session_shutdown`、`agent_start`、`agent_end`、`agent_settled` 两版同名同 payload（types.d.ts 逐个 diff SAME）。0.86 新增 `cache_warming_decision` 事件，仅新增。
4. **移植后代码在 0.86.1 上可原样运行**，无强制适配点。peerDeps `^0.84.0 || ^0.85.0 || ^0.86.0`（决定 #7）成立。
5. 注意项（非破坏）：0.86 对内置工具默认启用 strict JSON-schema sampling；0.85.0 起 `getApiKeyAndHeaders()` 返回 `ProviderHeaders` 值可为 `null` —— notify 均未触碰。
6. pi-tui：`Component`/`Key`/`matchesKey` 完全不变；0.86 仅新增 mouse 事件类型与 `OverlayBounds`（纯新增导出）。

## 1. API 触面清单（以 grep notify 实际代码为准）

| # | API / 导入 | 使用处 |
|---|---|---|
| 1 | `import type { ExtensionAPI } from "@earendil-works/pi-coding-agent"` | notify/index.ts:10、tools.ts:7、commands.ts:7、events.ts:8 |
| 2 | `import type { ExtensionContext }` | tools.ts:7、commands.ts:7、events.ts:8（handler ctx） |
| 3 | `import type { Theme } from "@earendil-works/pi-coding-agent"` | tui/settings-overlay.ts:11、tui/ntfy-setup.ts:11、tui/recap-model-selector.ts:11、tui/gotify-setup.ts:11、tui/telegram-setup.ts:10 |
| 4 | `import type { Component } / { Key, matchesKey } from "@earendil-works/pi-tui"` | 同上五个 tui/*.ts（Key 仅 ntfy-setup.ts:10） |
| 5 | `pi.registerTool(tool: ToolDefinition)` | tools.ts（registerNotifyTools） |
| 6 | `pi.registerCommand(name, { description, handler })` | commands.ts（/unipi:notify-settings 等 6 个命令） |
| 7 | `pi.on("session_start", handler)` | index.ts:43 |
| 8 | `pi.on("session_shutdown", handler)` | index.ts:73、events.ts:161 |
| 9 | `pi.on("agent_start"/"agent_end"/"agent_settled", handler)`（`(pi as any).on`） | events.ts:244、248、155-170、510-519 |
| 10 | `pi.events.on(channel, handler)`（返回 unsubscribe） | events.ts:220、227、241 —— 频道：`unipi:workflow:end`、`unipi:ralph:loop:end`、`unipi:mcp:server:error`、`unipi:memory:consolidated`、`permissions:ui_prompt`、`rpiv:ask-user:prompt`、`herdr:blocked`（均为字符串频道，非 pi 内置） |
| 11 | `pi.events.emit`（经 core 的 emitEvent 包装） | core/utils.ts:268-281（结构类型 `{ events: { emit } }`） |
| 12 | `ctx.ui.notify(msg, type?)`、`ctx.ui.custom(factory, opts?)`、`ctx.ui.onTerminalInput(fn)`、`ctx.hasUI`、`ctx.modelRegistry`、`ctx.cwd` | commands.ts:31/50-64 等、index.ts:49-59、events.ts:140 |
| 13 | `ToolDefinition.execute(toolCallId, params, signal, onUpdate, ctx: ExtensionContext)` | tools.ts:45 |
| 14 | `boxInnerWidth`、`OverlayTheme` 来自 `@pi-unipi/core`（内联对象，非 pi API） | tui/*.ts:12-14 —— 核心是 `theme.fg/bg/bold`（core/tui-overlay.ts:55-67），只依赖 Theme 的方法而非 ThemeColor 字面量枚举 |

skills/（notify、configure-notify）为 markdown prompt，不引用 pi API，仅引用 slash 命令名。

## 2. 逐项核对 0.84.4 vs 0.86.1（证据：npm 包 dist/*.d.ts diff）

| API | 0.86.1 状态 | 证据 |
|---|---|---|
| `ExtensionAPI.registerTool` | 签名逐字相同 | ca 0.84.4 types.d.ts:39 vs 0.86.1 types.d.ts:40 |
| `ExtensionAPI.registerCommand` / `RegisteredCommand` | 相同 | types.d.ts ExtensionAPI 内 + RegisteredCommand 接口 diff SAME |
| `ExtensionAPI.events: EventBus` | 相同（emit/on 同签名） | dist/core/event-bus.d.ts 两版完全一致 |
| `pi.on(...)` 各事件 | **返回值 `void` → `() => void`**（#8967，加退订能力）；事件集合仅新增 `cache_warming_decision`（types.d.ts:925 v86），无删除/改名 | diff /tmp/on84.txt vs /tmp/on86.txt |
| `session_start/shutdown/agent_start/agent_end/agent_settled` 事件 payload 类型 | 逐接口 diff SAME | types.d.ts 两版 awk diff |
| `ExtensionContext`（cwd/hasUI/modelRegistry/mode/ui/…） | 接口 diff SAME（exit 0） | types.d.ts ExtensionContext 两版 diff |
| `ExtensionUIContext.notify/custom/onTerminalInput` 及其余全部成员 | 两版逐字段相同 | types.d.ts ExtensionUIContext 两版全文 diff SAME |
| `ToolDefinition.execute` 五参签名 | 相同（0.84:372 vs 0.86:373） | types.d.ts |
| `Theme` 导出（type import） | 仍从 index 导出（0.86 index.d.ts:30）；`ThemeColor/ThemeBg` 仅**新增** `scrollbarTrack`/`scrollbarThumb` 前景色等，无删除 | theme.d.ts diff |
| pi-tui `Component`（tui.d.ts） | 未变；0.86 仅新增 mouse 事件类型（`TuiMouseEvent*`）与 `OverlayBounds` 导出 | pi-tui dist/tui.d.ts diff |
| pi-tui `Key` / `matchesKey`（keys.d.ts） | 两版文件 diff 为空 | keys.d.ts |

CHANGELOG 佐证（ca 0.86.1 CHANGELOG.md）：
- 0.86.0 Breaking：pi-ai 流式 `TranscriptContext`、`ToolCall.arguments`/`ToolResultMessage` JSON 化、`user_bash` fail-closed —— notify 均不使用。
- 0.85.0 Breaking：`GoogleThinkingLevel` 改名、`ModelsStreamTransforms`→`ModelsRequestTransforms`、`getApiKeyAndHeaders()` 返回含 `null`、message_update delta 化 —— notify 均不使用。

## 3. 结论：能否原样运行

**能。** 移植后在 0.86.1 上无需任何适配即可运行。可选（非必须）适配点：

- 无强制项。
- 可选：利用 `pi.on()` 新返回的 unsubscribe 简化 reload 清理逻辑（当前 events.ts 已靠 pi.on 处理器 reload 自动替换 + EventBus unsubs 手动管理，兼容两版）。

## 4. 事件名核对

`pi.on` 扩展事件：0.84 共 36 个，0.86 共 37 个；diff 仅两类变化 —— (a) 全部返回类型 `void → () => void`；(b) 新增 `cache_warming_decision`。notify 依赖的 5 个生命周期事件名与 payload 均未变。`pi.events.on` 的字符串频道是 UniPi/第三方扩展自定义命名空间（`unipi:*`、`herdr:*`、`rpiv:*`、`permissions:ui_prompt`），不随 pi 版本变化；其中 `permissions:ui_prompt` 是否仍由 pi 内部发出需在集成时验证（0.84/0.86 类型均不声明它，属运行时字符串频道，风险低）。

## 与票面假设的冲突

无。唯一意外发现：本机 0.86.1 mise/aqua 安装不含 dist .d.ts（原生二进制），核查改用 npm registry 同版本 tgz，结论不受影响。
