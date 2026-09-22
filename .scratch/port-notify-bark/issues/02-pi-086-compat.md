# pi 0.84→0.86.1 兼容性核查：notify 触碰的每个 pi API 还能用吗

Status: open
Type: research

## Question

上游 notify peerDependencies 是 `@earendil-works/pi-coding-agent ^0.84.0` 与 `@earendil-works/pi-tui ^0.84.0`；本机安装的是 pi 0.86.1（/root/.local/share/mise/installs/pi/0.86.1/pi/）。目标 peerDeps 范围是 ^0.84.0 || ^0.85.0 || ^0.86.0（决定 #7）。

请产出：

1. **API 触面清单**：notify 包实际用到的 pi API 全集 —— ExtensionAPI 方法（pi.on 各事件名、registerTool、registerCommand、on("session_start") 等）、事件回调 ctx 的形状（ctx.ui.onTerminalInput、ctx.cwd 等）、pi-tui 组件（Overlay/Theme/boxInnerWidth 相关）、以及 skills/commands 里引用的 slash 命令注册方式。以 grep 实际代码为准。
2. **逐项核对 0.86.1**：在本机 0.86.1 安装（及/或 UniPi 锁定的 0.84 node_modules）中核对每项：签名未变 / 签名变化（列出差异）/ 已移除（列出替代）。给出证据文件路径。
3. **结论**：移植后代码在 0.86.1 上能否原样运行？若不能，列出需要适配的点（每点：API、旧行为、新行为、涉及 notify 文件）。
4. **事件名核对**：notify 依赖的 pi 生命周期事件（agent_end、workflow_end、session_shutdown 等）在 0.84 与 0.86 之间是否有增删改名。

若发现破坏性变更，不要给完整补丁 —— 只给事实与适配点清单，具体拆票由地图毕业（见 map.md Not yet specified）。
