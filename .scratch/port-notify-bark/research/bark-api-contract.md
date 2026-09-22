# Research: Bark 推送 API 契约确认

票：issues/03-bark-api-contract.md · 分支 research/bark-api-contract

## 结论速览

1. **请求形状**：推荐 `POST {serverUrl}/{deviceKey}`，`application/x-www-form-urlencoded`，所有参数进 body。device_key 也可放 form body（POST /{key} 时可省；JSON 走 `/push` 时必须）。pi-bark 实际用 `POST endpoint` + URLSearchParams（endpoint 含 key）。
2. **参数名**：`title` `subtitle` `body` `group` `icon` `sound` `level` 全小写，GET/form/JSON 三种形式同名。form 值全部为字符串。
3. **level 枚举**：`active`（默认）/ `passive` / `timeSensitive` / `critical`（camelCase，需 app 内权限，无权限降级为普通通知）。决定 #4 的映射合法。
4. **布尔表达**：`isArchive` 传 `1` 保存、其他值不保存；`call`/`delete` 传 `"1"`。即 form 里布尔 = 字符串 "1"。
5. **响应与错误**：文档未给出 JSON 响应形状与错误码语义（bark-server 源码不在本地，证据等级低）；pi-bark 只判 `response.ok`，非 2xx 抛 `Bark returned HTTP <status>`。
6. **timeout**：官方无超时建议；pi-bark 用 4000ms（`AbortSignal.timeout`），可沿用。
7. **icon 只接受远程 URL**（iOS 15+，客户端下载并缓存，同一 URL 只下载一次）。本地打包 png 无法直接用于 icon —— pi-bark 的做法是把 assets/pi-icon.png 放 GitHub raw URL 引用。决定 #10 应改为"配置默认 raw.githubusercontent URL 或文档引导用户自托管"。

---

## 事实表

### 1. 请求形状

| # | 事实 | 来源 |
|---|------|------|
| 1.1 | 端点为 `{serverUrl}/{deviceKey}`，key 在 URL 路径；URL 有三种组合 `/:key/:body`、`/:key/:title/:body`、`/:key/:title/:subtitle/:body` | `/root/clone/Bark/docs/en-us/tutorial.md` "URL Format" 节 |
| 1.2 | 支持 GET（参数拼 query）与 POST；POST form 示例：`curl -X POST https://api.day.app/your_key -d'body=body&group=groupName'` | tutorial.md "Request Methods" |
| 1.3 | POST 也支持 JSON body（Content-Type: application/json; charset=utf-8） | tutorial.md JSON 示例 |
| 1.4 | JSON 请求可把 key 放 body 的 `device_key` 字段，此时 URL 路径必须是 `/push` | tutorial.md 最后一个 curl 示例 + params.md device_key 节 |
| 1.5 | pi-bark 实际实现（已验证）：`fetch(config.endpoint, { method: "POST", body: form })`，form 为 `URLSearchParams`，endpoint 含 deviceKey（用户配置完整 URL） | `/root/clone/herbertgao-pi-extensions/packages/pi-bark/src/index.ts` sendBark() |
| 1.6 | pi-bark 对自定义 params 先 `String(value)` 再 `form.set(key, ...)`，然后 `form.set("title", title)`、`form.set("body", body)`（动态值覆盖用户 params） | pi-bark src/index.ts sendBark() |

### 2. 参数契约

| # | 事实 | 来源 |
|---|------|------|
| 2.1 | 参数名在 GET query、POST form、JSON body 三种形式完全一致（title/subtitle/body/markdown/device_key/device_keys/group/icon/image/badge/level/volume/call/sound/copy/url/action/ciphertext/iv/isArchive/ttl/id/delete） | params.md 首段 |
| 2.2 | form 值均为字符串；pi-bark 对 number/boolean 做 `String()` 转换 | params.md + pi-bark index.ts |
| 2.3 | level 合法值：`active`（默认，亮屏即显）、`timeSensitive`（专注模式可穿透）、`passive`（仅入列表不亮屏）、`critical`（静音也响铃；需 app 内 critical alert 权限，否则降级普通通知，音量由 volume 控制 0-10 默认 5）；iOS 15+ | params.md level/volume 节 |
| 2.4 | isArchive：传 `1` 保存历史，"any other value not to save"，不传由 app 设置决定（默认保存） | params.md isArchive 节 |
| 2.5 | call / delete：传 `"1"` | params.md call、delete 节 |
| 2.6 | sound：铃声名（如 `minuet`），支持内置与导入（.caf ≤30s）；名字不存在回退默认提示音 | params.md sound 节 |
| 2.7 | group：相同 group 折叠分组，可静音 | params.md group 节 |

### 3. 响应与错误

| # | 事实 | 来源 |
|---|------|------|
| 3.1 | 文档未描述成功/失败响应 JSON 形状与 HTTP 错误码语义 | tutorial.md/params.md 全文无相关内容 |
| 3.2 | /root/clone/Bark 是 iOS 客户端仓库，**无 bark-server 源码**（ls 确认：Bark/ Controller/ View/ 等 Xcode 工程）；服务端行为不可从本地一手来源确认，勿臆测 `code:200` 形状 | 目录列表 |
| 3.3 | pi-bark 失败判定：仅 `if (!response.ok) throw new Error("Bark returned HTTP " + status)`；所有错误被吞（best-effort） | pi-bark index.ts sendBark() + notify() 的 try/catch |
| 3.4 | 建议 bark.ts 沿用 response.ok 判定，不解析 body（解析 code 字段属低证据等级猜测） | 推论 |

### 4. timeout

| # | 事实 | 来源 |
|---|------|------|
| 4.1 | 官方/社区超时建议：文档中无 | tutorial.md/params.md |
| 4.2 | pi-bark：`DEFAULT_TIMEOUT_MS = 4_000`，用户可配 `timeoutMs`（正有限数），用 `AbortSignal.timeout(config.timeoutMs)` | pi-bark index.ts 顶部与 normalizeConfig |

### 5. icon 参数（影响决定 #10）

| # | 事实 | 来源 |
|---|------|------|
| 5.1 | icon 是"set to an image URL"——**只接受远程图片 URL**，替换通知中默认 Bark 图标 | params.md icon 节 |
| 5.2 | iOS 客户端下载并缓存 icon，同一 URL 只下载一次；首次下载超 10 秒回退默认图标；需 iOS 15+ | params.md icon 节 |
| 5.3 | pi-bark 打包 `assets/pi-icon.png`（512×512，Pi 官方 badge）但代码不直接上传——README 让用户在 params.icon 配 GitHub raw URL：`https://raw.githubusercontent.com/HerbertGao/pi-extensions/master/packages/pi-bark/assets/pi-icon.png` | pi-bark README.md:28,38 + index.ts（代码中无 asset 引用，已 grep 确认） |
| 5.4 | 推论：Bark 无上传接口，"内置 Pi 图标"只能是默认配置一个远程 URL（借用 pi-bark 的 raw URL、或 raincore 自托管、或文档引导），打包本地 png 本身不足以生效 | 5.1+5.3 推论 |

## 对 map.md 决定的影响

- 决定 #4（priority 映射 low/normal/high → passive/active/timeSensitive）与 level 枚举完全吻合，无需改。
- 决定 #10 需微调：icon 只能是 URL。实现上建议默认 group/icon 作为配置默认值（icon 默认指向一个托管 URL），或在文档说明。可能值毕业为小设计票（map.md "Not yet specified" 已预留）。

## 证据等级说明

- A（官方文档）：/root/clone/Bark/docs/en-us/tutorial.md、params.md —— 请求形状、参数、level/icon 语义。
- B（已验证实现）：pi-bark src/index.ts —— POST form 用法、超时、错误处理。
- 未知（未确认）：服务端响应 JSON 形状、404/400 精确语义 —— 本地无 bark-server 源码，实现时不要依赖响应体。
