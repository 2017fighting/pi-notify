# 内联 core 的模块结构：单文件还是镜像模块

Type: grilling
Status: resolved
Blocked by: 01

## Question

拿到 [内联 core 依赖清单](01-inline-core-inventory.md) 的事实后，与用户敲定 vendored core 的落位：

- 单文件 `vendored/core.ts`（一个门面模块，notify 各文件 import 改写为一处路径）vs 镜像 core 原模块划分 `vendored/events.ts`、`vendored/tui.ts`…？
- 模块命名与目录（vendored/ vs compat/ vs core/）？
- MIT 归属说明放文件头还是单独 NOTICE？
- notify 各文件里 `from "@pi-unipi/core"` 的 import 改写策略：统一改成相对路径，还是留一个 package.json alias？

HITL：用 /grilling + /domain-modeling 与用户对齐；答案记录本票后关闭，并在 map.md Decisions so far 追加指针。

## Answer

用户拍板（2026-09-22）：**采用推荐的镜像布局（选项 A）**。

- `vendored/constants.ts`、`vendored/events.ts`、`vendored/utils.ts`、`vendored/model-cache.ts`、`vendored/tui-width.ts`、`vendored/tui-overlay.ts` + `vendored/index.ts` re-export 门面，文件/导出名与 core 一一对应，便于逐文件 diff 同步上游。
- notify 源码 13 处 `from "@pi-unipi/core"` 单行改写为相对路径 `vendored/index.js`（按目录层级调整），业务文件结构不动。
- **符号名保持不变**（最小 diff），只改值：`UNIPI_PREFIX` 值 → `"notify:"`、`NOTIFY_DIRS.CONFIG` 值 → `~/.pi/agent/notify`、`MODULES.NOTIFY` 值 → `@raincore/pi-notify`。内部标识符里的 UNIPI 字样不追求清除，只清用户可见面。
- 归属：`vendored/NOTICE.md`（注明源仓库/包名/版本/作者/ MIT），package.json 保持 `"license": "MIT"`。
