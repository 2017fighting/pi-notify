# 内联 core 依赖清单（票 01）

研究范围：/root/clone/UniPi/packages/notify 全目录（含 platforms/、tui/、src/__tests__/、__tests__/、skills/）对 `@pi-unipi/core` 的导入，及其在 /root/clone/UniPi/packages/core 内的传递依赖闭包。只读研究，未改动任何源码。

## 结论速览

- notify 全目录共 **13 处** `from "@pi-unipi/core"` 导入，涉及 **11 个符号**：`UNIPI_EVENTS`、`emitEvent`、`UNIPI_PREFIX`、`NOTIFY_COMMANDS`、`NOTIFY_DIRS`、`NOTIFY_TOOLS`、`MODULES`、`OverlayTheme`、`boxInnerWidth`、`readModelCache`、`CachedModel`（type）、`getPackageVersion`。票面线索清单与实际完全吻合，无遗漏、无多余。
- 闭包落在 core 的 **5 个文件**：`constants.ts`、`events.ts`、`utils.ts`、`model-cache.ts`、`tui-width.ts`、`tui-overlay.ts`（OverlayTheme 依赖 tui-width 的 `safeRepeat`）。
- 需要内联的实际代码量很小：**约 260–320 行**（纯符号裁剪后）；若整文件搬运约 1050 行（6 个文件，剔除不需要的 sandbox/bounded-output/spinner-line/fusion-status）。
- 唯一外部类型依赖：`tui-overlay.ts` 引 `@earendil-works/pi-coding-agent` 的 `Theme` 与 `@earendil-works/pi-tui` 的 `truncateToWidth/visibleWidth`——两者已是 notify 的 peerDependencies（packages/notify/package.json），无需新增依赖，可剥离性好。
- 推荐布局：**镜像 core 模块划分的 `vendored/*.ts`**（最小 diff + 便于同步上游），并可用一个 `vendored/index.ts` re-export，让 notify 源文件只需把 `"@pi-unipi/core"` 一处改写为 `"./vendored/index.js"`（相对路径按文件层级调整）。最终布局决定留给票 04。

## 1. 导入清单（notify 全目录，grep 实测）

| 文件 | 导入符号 | 行号 |
|---|---|---|
| `index.ts` | `UNIPI_EVENTS, MODULES, NOTIFY_TOOLS, emitEvent, getPackageVersion` | 11–17 |
| `commands.ts` | `UNIPI_PREFIX`；`NOTIFY_COMMANDS`；`type CachedModel` | 8, 9, 15 |
| `events.ts` | `UNIPI_EVENTS, emitEvent` | 9 |
| `tools.ts` | `NOTIFY_TOOLS` | 9 |
| `settings.ts` | `NOTIFY_DIRS` | 10 |
| `tui/settings-overlay.ts` | `OverlayTheme, boxInnerWidth` | 18 |
| `tui/ntfy-setup.ts` | `boxInnerWidth, OverlayTheme` | 14 |
| `tui/recap-model-selector.ts` | `readModelCache, type CachedModel, boxInnerWidth, OverlayTheme` | 12 |
| `tui/gotify-setup.ts` | `boxInnerWidth, OverlayTheme` | 14 |
| `tui/telegram-setup.ts` | `OverlayTheme, boxInnerWidth` | 13 |
| `src/__tests__/events.test.ts` | `UNIPI_EVENTS` | 9 |
| `src/__tests__/tui-input.test.ts` | `type CachedModel` | 36 |

无 core 导入的目录/文件（已核实）：`platforms/`（native/telegram/ntfy/gotify/focus/focus-win/node-notifier.d.ts）、`__tests__/priority.test.ts`、`src/__tests__` 其余测试、`skills/`（configure-notify、notify，markdown 无代码导入）、`activity.ts`、`summarize.ts`、`types.ts`、`ask-user-prompt-message.ts`、`permission-prompt-message.ts`、`ntfy-config.ts`。

## 2. 传递依赖闭包（core 内递归到底）

| 符号 | core 定义文件:行 | 内部依赖（core 内） | 内部依赖（外部） |
|---|---|---|---|
| `UNIPI_PREFIX` | `constants.ts:6` | 无 | 无 |
| `MODULES` | `constants.ts:18` | 无（仅字符串常量） | 无 |
| `NOTIFY_COMMANDS` | `constants.ts:286` | 无 | 无 |
| `NOTIFY_TOOLS` | `constants.ts:297` | 无 | 无 |
| `NOTIFY_DIRS` | `constants.ts:302` | 无（值 `~/.unipi/config/notify`，注意迁移票需改写，非本票范围） | 无 |
| `UNIPI_EVENTS` | `events.ts:9`（约 80 行 const） | 无 | 无 |
| `emitEvent` | `utils.ts:268`（safe wrapper，无其他 core 调用） | 无 | 仅结构类型 `{ events: { emit } }` |
| `getPackageVersion` | `utils.ts:138` | `readJson`（utils.ts:96） | node:fs/path |
| `readModelCache` / `CachedModel` | `model-cache.ts:26`（interface）、`model-cache.ts:47` | `cacheDir/cacheFile`（文件内私有函数，~10 行）；可选带 `writeModelCache`（:62） | node:fs/path |
| `boxInnerWidth` | `tui-width.ts:55` | `normalizeWidth`（:34）、`MIN_RENDER_WIDTH`（:27） | 无（该文件刻意零 pi-tui 依赖，见文件头注释 :16） |
| `OverlayTheme` | `tui-overlay.ts:46`（class，~60 行） | `FALLBACK_COLORS`（:15，私有）、`safeRepeat`（tui-width.ts:93） | `Theme`（@earendil-works/pi-coding-agent，type-only）、`truncateToWidth/visibleWidth`（@earendil-works/pi-tui） |

闭包终点：`tui-overlay.ts → tui-width.ts (safeRepeat → safeRepeatCount → normalizeWidth/MIN_RENDER_WIDTH)`；`utils.ts → readJson`；其余无再深一层。core 的 `sandbox.ts / bounded-output.ts / spinner-line.ts / fusion-status.ts / global-types.ts` 均**不在**闭包内，无需搬运。

## 3. 体量与形态

- 纯符号裁剪合计约 **260–320 行**：constants 5 个符号 ~15 行、UNIPI_EVENTS ~80 行、emitEvent+getPackageVersion+readJson ~45 行、model-cache 裁剪 ~60 行（含 interface；writeModelCache 可选+15 行）、tui-width 裁剪 ~50 行、OverlayTheme+FALLBACK_COLORS+imports ~75 行。
- 整文件搬运（6 文件）约 **1055 行**（constants 365 + events 367 + utils 384 + model-cache 76 + tui-width 145 + tui-overlay 121 — 裁掉的部分其实只占小头）。
- 形态混合：常量（constants/events）+ 工具函数（utils、tui-width）+ 类（OverlayTheme）+ 类型（CachedModel）。
- 难剥离外部依赖：**没有**。唯一跨包引用是 `Theme`（type-only）与 pi-tui 的两个纯函数，均已是 notify 的 peerDependencies（`packages/notify/package.json` peerDependencies: `@earendil-works/pi-coding-agent ^0.84.0`、`@earendil-works/pi-tui ^0.84.0`）。
- 值得注意：`tui-overlay.ts` 中还导出 `frameOverlay`（:88），notify 未使用，裁剪版可不带；`utils.ts` 中 `emitEvent` 与 `getPackageVersion` 相距甚远，整文件搬运最省事。

## 4. 内联布局选项

### 选项 A：镜像 core 模块划分 `vendored/*.ts`（推荐）

```
vendored/constants.ts   # 仅裁出 UNIPI_PREFIX/MODULES/NOTIFY_*（或整文件）
vendored/events.ts      # UNIPI_EVENTS
vendored/utils.ts       # emitEvent/getPackageVersion/readJson
vendored/model-cache.ts # readModelCache/CachedModel
vendored/tui-width.ts   # boxInnerWidth + safeRepeat 链
vendored/tui-overlay.ts # OverlayTheme
vendored/index.ts       # export * 各文件（模拟 core 的 index.ts）
```

- 贴近上游结构：★★★★★ 文件名/导出名与 core 一一对应，日后上游 core 改动可逐文件 diff 同步；notify 业务文件结构完全不动。
- 最小 diff：★★★★☆ notify 的 13 处 import 只需把 `"@pi-unipi/core"` 改成相对路径 `"./vendored/index.js"`（tui/ 下为 `"../vendored/index.js"`，测试为 `"../../vendored/index.js"`），每处单行替换。
- 代价：vendored/ 下文件头注释含 `@pi-unipi/core` 字样需改写（机械）。

### 选项 B：单文件 `vendored/core.ts`

- 贴近上游结构：★★☆☆☆ core 内部模块边界消失，上游 core 任何文件改动都需人工在单文件里定位，长期同步成本高。
- 最小 diff：★★★★★ 同样只有 13 处单行 import 改写，且 vendored 自身只有一个文件、无内部相对导入。
- 适合：若想彻底"冻结"内联物、明示不再与上游 core 同步。

**推荐选项 A**：决定 #6（贴近上游、最小 diff、便于手动同步）下，A 的逐文件镜像让"同步上游"成为 diff 作业而非考古作业；import 改写成本与 B 完全相同。（最终决定留给票 04。）

## 5. 许可证归属（MIT，作者 Neuron Mr White）

建议两处：

1. `vendored/` 目录下 `vendored/NOTICE.md`（或各文件头部统一注释）：

   > Code in this directory is vendored from [UniPi](https://github.com/Neuron-Mr-White/unipi) `packages/core` (`@pi-unipi/core`, v2.20.5).
   > Copyright (c) Neuron Mr White. Licensed under the MIT License.

2. `package.json` 保持 `"license": "MIT"`，可加 `"credits"`/README 致谢段（措辞同上）。上游 notify 的 package.json 已含同样的 MIT/author 字段，移植后沿用即可。

## 意外发现 / 与票面假设的出入

- 无实质出入；票面给的符号线索清单经 grep 核实**恰好完备**。
- 附带事实（供其他票）：`NOTIFY_DIRS.CONFIG = "~/.unipi/config/notify"`（constants.ts:302）——决定 #3 要求配置迁到 `~/.pi/agent/notify/config.json`，vendored 时须改此常量或在其消费处 settings.ts 调整（属票 04/移植票注意项，不是本票动作）。`UNIPI_PREFIX = "unipi:"`（constants.ts:6）决定 #3 要求改 `/notify:` 前缀，同属 vendored 改写点。`MODULES.NOTIFY = "@pi-unipi/notify"` 用于 index.ts:65 的 module ready 事件名，去品牌时需一并审视。
- `writeModelCache`（model-cache.ts:62）notify 未直接调用，但整文件搬运会带上，无害。
