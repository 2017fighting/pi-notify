# Bark icon 默认值：打包资产改为哪种远程 URL 方案

Type: grilling
Status: resolved

## Question

[Bark 推送 API 契约确认](03-bark-api-contract.md) 证实 Bark icon 只接受远程图片 URL（iOS 15+，客户端下载并按 URL 缓存），本地打包 png 无法直接生效；参考实现 pi-bark 也是让用户配置 GitHub raw URL。原决定 #10「内置 Pi 图标」需改写为以下之一（或用户另提）：

- **A. 默认借用 pi-bark 的公开 raw URL**（`https://raw.githubusercontent.com/HerbertGao/pi-extensions/master/packages/pi-bark/assets/pi-icon.png`）—— 零托管成本、开箱即有图标；代价是可用性依赖他人仓库，且图标归属他人 CDN。
- **B. 自托管 raw URL** —— 需要一个可公开访问的托管位置（本仓库目前无远端、不发布 npm，需用户提供）。
- **C. 不设默认 icon** —— README 引导用户自填 URL；最少惊喜，但没有开箱图标。
- **D. 打包 `assets/pi-icon.png` 仅作资产**（供未来自托管/用户自行上传），默认值另按 A/C 处理。

同时敲定：默认值（若选 A/B）写进 bark 平台默认配置还是 README 示例；用户显式配置的 icon 永远覆盖默认。

HITL：用 /grilling 与用户对齐；答案记录本票后关闭，并在 map.md Decisions so far 追加指针、修订 Notes 决定 #10。

## Answer

用户拍板（2026-09-22）：**D+B 组合 —— 资产入仓 + 本仓库 raw URL 作默认**（“复制到本仓库，推上 GitHub 就有了地址”）。

- `assets/pi-icon.png`（5,986 B，源自 pi-bark 同名文件，Pi 官方 badge 512×512，MIT）已复制入仓。
- bark 平台默认 `icon` = `https://raw.githubusercontent.com/2017fighting/pi-notify/main/assets/pi-icon.png`（仓库 PUBLIC，Bark 客户端可匿名拉取并按 URL 缓存）。
- 用户显式配置的 `icon` 永远覆盖默认；不想要图标可显式设空串。
- URL 引用 main 分支：Bark 按 URL 缓存只下载一次，后续同 URL 内容变更不会重新拉取 —— 图标文件定稿后不要再改内容；移动/删除文件会使新设备拿到 404（客户端 10s 超时后回退默认图标，无害）。
