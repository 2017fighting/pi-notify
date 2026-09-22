# Wayfinder Map: 移植 UniPi notify → pi-notify 并新增 Bark 一等平台

Label: wayfinder:map

## Destination

本仓库（/root/clone/pi-notify）得到一个可独立安装、去品牌、零 @pi-unipi/core 依赖、Bark 为第五个一等平台的 pi 通知扩展（@raincore/pi-notify）。全部决策关闭后，任何后续会话可照图直接开工移植。

## Notes

- 域：pi coding agent 扩展移植。全程使用 [domain-modeling](../../CONTEXT.md) 词汇表（如引入新术语请记录）。
- 主源（只读）：
  - 上游包：/root/clone/UniPi/packages/notify（v2.20.5，目标结构模板）
  - 共享包：/root/clone/UniPi/packages/core（@pi-unipi/core，待内联）
  - Bark 参考：/root/clone/herbertgao-pi-extensions/packages/pi-bark（POST form API 用法、assets/pi-icon.png）
  - Bark 文档（一手）：/root/clone/Bark/docs/en-us/（tutorial.md、params.md、encryption.md）
  - 本机 pi 0.86.1：/root/.local/share/mise/installs/pi/0.86.1/pi/
- 技能：research 票由 scout 子代理解决；HITL 票用 /grilling + /domain-modeling。
- 既有决定（本轮 charting grilling 中与用户敲定，无单独票）：
  1. **完整移植 + 独立化**：移植全部功能，内联所需 @pi-unipi/core，零 UniPi 依赖。
  2. **Bark 为一等平台**：进平台注册表，统一 config、/notify-set-bark 命令、设置面板、事件路由、priority 映射。
  3. **去 Unipi 品牌**：命令前缀 /notify:*，配置迁至 ~/.pi/agent/notify/config.json。
  4. **常用 Bark 参数**：serverUrl、deviceKey、group、icon、sound、level、timeoutMs；priority 语义映射 low/normal/high → passive/active/timeSensitive，critical 仅显式配置可及。
  5. **不发布 npm**：package.json 预留名 @raincore/pi-notify（npm 账号 raincore），不设 publishConfig。
  6. **贴近上游文件结构**：最小 diff 移植，便于日后手动同步上游。
  7. **peerDependencies**：^0.84.0 || ^0.85.0 || ^0.86.0。
  8. **英文文案**：通知标题/正文沿用上游英文硬编码。
  9. **Bark 配置形态**：serverUrl + deviceKey 分字段（ntfy 风格）。
  10. **内置 Pi 图标**：~~打包 pi-icon.png 作为 icon 默认值~~ ⚠️ 已被 [Bark 推送 API 契约确认](issues/03-bark-api-contract.md) 的事实推翻：Bark icon 仅接受远程 URL，本地打包 png 不生效。改写方案见 [Bark icon 默认值](issues/05-bark-icon-default.md)。

## Decisions so far

- [内联 core 依赖清单](issues/01-inline-core-inventory.md) — 11 符号闭包落 6 文件、裁剪约 260–320 行、唯一外部依赖 Theme(type) + pi-tui 两函数（均已是 peerDeps）；推荐镜像布局 `vendored/*.ts` + `vendored/index.ts`，notify 侧仅 13 处单行 import 改写；另定位去品牌改写点 `UNIPI_PREFIX`/`NOTIFY_DIRS.CONFIG`/`MODULES.NOTIFY`。详：[research/core-inventory.md](research/core-inventory.md)
- [pi 0.84→0.86.1 兼容性核查](issues/02-pi-086-compat.md) — notify 全触面无破坏性变更（唯一变化：`pi.on()` 0.86 起返回 unsubscribe，纯增强且 notify 未用），0.86.1 可原样运行；peerDeps `^0.84.0 || ^0.85.0 || ^0.86.0` 成立；**无适配点，无需拆票**。详：[research/pi-086-compat.md](research/pi-086-compat.md)
- [Bark 推送 API 契约确认](issues/03-bark-api-contract.md) — `POST {serverUrl}/{deviceKey}` form 编码全字符串、参数名全小写、level 枚举 camelCase 与决定 #4 完全吻合、失败只判 `response.ok` 不解析响应体、timeout 沿用 4000ms；**icon 仅接受远程 URL** → 推翻决定 #10，毕业为 [Bark icon 默认值](issues/05-bark-icon-default.md)。详：[research/bark-api-contract.md](research/bark-api-contract.md)

## Not yet specified

（暂无 —— 原雾团「pi 0.86 适配补丁」因 02 号票证实零适配点而直接消散；「Bark 平台补充设计」已收窄并毕业为 [Bark icon 默认值](issues/05-bark-icon-default.md)，其余契约事实均与既有假设吻合。）

## Out of scope

- npm 发布（只预留包名，本图不含发布动作）。
- 中文/i18n 通知文案。
- Bark 全参数支持：加密、批量 device_keys、markdown、image、badge、url/copy/action、isArchive。
- ~/.unipi 旧配置的自动迁移。
- 建立持续同步上游 UniPi 更新的机制（仅在结构上留便利，不建流程）。
- native/gotify/telegram/ntfy 四平台的行为改动（保持上游原样）。
