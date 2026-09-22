# 内联 core 的模块结构：单文件还是镜像模块

Status: open
Type: grilling
Blocked by: 01

## Question

拿到 [内联 core 依赖清单](01-inline-core-inventory.md) 的事实后，与用户敲定 vendored core 的落位：

- 单文件 `vendored/core.ts`（一个门面模块，notify 各文件 import 改写为一处路径）vs 镜像 core 原模块划分 `vendored/events.ts`、`vendored/tui.ts`…？
- 模块命名与目录（vendored/ vs compat/ vs core/）？
- MIT 归属说明放文件头还是单独 NOTICE？
- notify 各文件里 `from "@pi-unipi/core"` 的 import 改写策略：统一改成相对路径，还是留一个 package.json alias？

HITL：用 /grilling + /domain-modeling 与用户对齐；答案记录本票后关闭，并在 map.md Decisions so far 追加指针。
