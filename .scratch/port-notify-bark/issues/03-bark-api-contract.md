# Bark 推送 API 契约确认：bark.ts 实现的精确事实

Status: open
Type: research

## Question

pi-notify 将新增 platforms/bark.ts（一等平台，见 map.md 决定 #2/#4/#9）。实现前把 Bark 服务端 API 契约钉死。只认一手来源：/root/clone/Bark/docs/en-us/tutorial.md 与 params.md（Bark 官方文档）、pi-bark 的 src/index.ts（已验证的实现参考）。若 /root/clone/Bark 仓库内有 server 端源码（bark-server）也优先看；没有就不要猜。

请确认：

1. **请求形状**：POST form（application/x-www-form-urlencoded）的确切语义 —— 端点路径（{serverUrl}/{deviceKey} 还是 /push？device_key 放 URL 路径、body 还是均可？）；pi-bark 实际怎么发的（逐行引用）；官方文档推荐的形状。
2. **参数契约**：title/subtitle/body/group/icon/sound/level 的准确参数名与大小写；form 值是否全部为字符串；level 的合法枚举（active/passive/timeSensitive/critical? 大小写?）；isArchive 等布尔在 form 里怎么表达。
3. **响应与错误**：成功响应 JSON 形状（code/message/data?）；404/400 语义（key 无效 vs 参数错误）；pi-bark 如何判定失败、如何处理超时。
4. **timeout 惯例**：pi-bark 用 4000ms —— 官方或社区有无超时建议，没有就确认 pi-bark 值可沿用。
5. **icon 参数**：确认 icon 接受远程 URL（pi-bark 打包了本地 png 但 URL 才是 Bark 语义？还是两者都行）——这影响"内置 Pi 图标"（决定 #10）的实现方式：是配置默认 URL、运行时上传、还是文档说明用户自托管。

产出为契约事实表（每条带来源引用），供 bark.ts 直接照写，不需要写实现代码。
