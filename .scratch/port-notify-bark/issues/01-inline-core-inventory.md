# 内联 core 依赖清单：要搬什么、最小怎么搬

Status: resolved
Type: research

## Question

把 /root/clone/UniPi/packages/notify 移植为独立包（零 @pi-unipi/core 依赖）时，需要从 /root/clone/UniPi/packages/core 内联哪些东西？

请产出：

1. **导入清单**：notify 包（含 platforms/、tui/、src/__tests__/、__tests__/、skills/）中所有 `from "@pi-unipi/core"` 导入的符号，逐个列出。已知线索：UNIPI_EVENTS、emitEvent、UNIPI_PREFIX、NOTIFY_COMMANDS、NOTIFY_DIRS、NOTIFY_TOOLS、MODULES、OverlayTheme、boxInnerWidth、readModelCache、CachedModel、getPackageVersion（请以实际 grep 为准，勿信此清单完备）。
2. **传递依赖**：每个符号在 core 包内的定义文件、其内部又依赖 core 的哪些其他符号/文件（递归到闭包）。
3. **体量与形态**：闭包合计大约多少行、是否包含 TUI 组件/类型/常量/工具函数的混合，是否有难以剥离的外部依赖（如 pi-tui、pi-coding-agent 的类型）。
4. **内联布局选项**：给出 2 个左右可选的 vendoring 布局（如单文件 vendored/core.ts vs 镜像 core 的模块划分 vendored/*.ts），各自对"贴近上游 notify 文件结构 + 最小 diff"的影响，附推荐及理由。
5. **许可证归属**：core 为 MIT（作者 Neuron Mr White），给出内联时归属说明的建议位置与措辞。

约束：上游 notify 文件本身保持结构不变（决定 #6），因此内联物对外导出的模块路径越像 `@pi-unipi/core` 越好（如 `./vendored/core.js` 一处 import 改写）。产出为事实与选项，最终布局决定留给 [内联 core 的模块结构](04-vendored-core-layout.md)。

## Answer

grep 核实：notify 全目录共 13 处 `@pi-unipi/core` 导入、11 个符号，票面线索清单恰好完备。闭包收敛在 core 的 6 个文件（constants/events/utils/model-cache/tui-width/tui-overlay），裁剪后约 260–320 行、整文件约 1055 行；唯一外部依赖是 Theme（type-only）与 pi-tui 两个纯函数，均已是 notify peerDependencies，无剥离障碍。推荐 vendored/*.ts 镜像布局 + vendored/index.ts re-export，使上游 notify 文件只需 13 处单行 import 改写；MIT 归属放 vendored/NOTICE.md。注意点：UNIPI_PREFIX、NOTIFY_DIRS.CONFIG、MODULES.NOTIFY 三个常量含 unipi 品牌，是决定 #3 的 vendored 改写点。

详见 [research/core-inventory.md](../research/core-inventory.md)。
