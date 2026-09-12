# 简单任务拆解 API

本地 API。参考 Magic ToDo 的任务拆解交互，使用自己的提示词；不是其私有模型或提示词的复制。现在同时包含 Node.js 版本和 Python 版本；GitHub Pages 前端只需要能访问同样的 `/api/...` 路由。

## Python 启动

Python 版本使用标准库，不需要安装依赖。从项目根目录运行：

```powershell
Copy-Item api/.env.example api/.env
# 编辑 api/.env，填入 DEEPSEEK_API_KEY
python scripts/start_api.py
```

服务器平台上设置同样的环境变量，并使用启动命令：

```sh
python server.py
```

Python API 默认监听 `0.0.0.0:$PORT`，未设置 `PORT` 时使用 `3001`。部署后，在网站浏览器控制台设置你的公网 API 地址：

```js
localStorage.setItem('fryplan-api-base', 'https://your-python-api.example')
```

## Node.js 启动

需要 Node.js 22.17+ 或 24+，无需安装依赖。从项目根目录运行：

```powershell
Copy-Item api/.env.example api/.env
# 编辑 api/.env，填入 DEEPSEEK_API_KEY 和 DEEPSEEK_MODEL
node --env-file=api/.env api/server.mjs
```

DEEPSEEK_MODEL 默认使用 deepseek-flash，可修改为账户可用、支持 Chat Completions API 和 JSON Output 的模型 ID。DEEPSEEK_VISION_MODEL 用于图片校验，未设置时沿用 DEEPSEEK_MODEL。密钥只保存在本地环境文件，已被 Git 忽略。服务默认只监听本机 127.0.0.1。

前端默认调用 `http://127.0.0.1:3001`。如需换地址，可在浏览器控制台设置：

```js
localStorage.setItem('fryplan-api-base', 'http://127.0.0.1:3001')
```

## 调用

### POST /api/estimate-time

估算大目标总耗时。前端 `pages/goal.html` 会调用它。

```json
{"goal":"读完老人与海"}
```

响应：

```json
{"time":"3小时"}
```

### POST /api/start-fries

根据大目标生成 3 根开始薯条。前端 `pages/select-fries.html` 会调用它。

```json
{"goal":"写论文第三章"}
```

响应：

```json
{"fries":[{"title":"打开论文文档","time":"3分钟"},{"title":"列出小节标题","time":"5分钟"},{"title":"写一句要点","time":"10分钟"}]}
```

### POST /api/verify-photo

校验上传截图是否完成最小任务。前端 `pages/upload.html` 会调用它；`passed` 为 `true` 时才保存完成记录。

```json
{"goal":"整理三篇参考文献","image":"data:image/png;base64,..."}
```

响应：

```json
{"related":true,"score":88,"passed":true,"summary":"图片是一份参考文献列表。","evaluation":"与任务对应。","message":"三篇文献整理得很清楚。"}
```

### POST /api/steps

保留原有任务拆解接口，Content-Type 为 `application/json`。

```json
{"topic":"给论文第三章写三个粗略要点","context":"电脑已打开，使用 Word，论文文档已存在"}
```

topic 必填，最多 200 字；context 可选，最多 1000 字。

PowerShell 示例：

```powershell
$body = @{ topic = '整理桌面' } | ConvertTo-Json
Invoke-RestMethod -Uri http://127.0.0.1:3001/api/steps -Method Post -ContentType 'application/json; charset=utf-8' -Body ([System.Text.Encoding]::UTF8.GetBytes($body))
```

响应示例（说明结构，不代表真实模型测试结果）：

```json
{
  "outcome": "在第三章写下并保存三个粗略要点",
  "scope": "full_goal",
  "steps": [
    { "title": "用 Word 打开论文文档", "minutes": 1 },
    { "title": "定位到第三章的正文", "minutes": 1 },
    { "title": "写下三个想表达的粗略要点", "minutes": 3 },
    { "title": "保存文档", "minutes": 1 }
  ],
  "totalMinutes": 6
}
```

最多 6 步，优先 2～4 步，简单任务可以只有 1 步。默认省略打开软件等准备动作。没有子步骤，每步标题最多 40 字。时长按工作量估计，不再限制为 1 或 3 分钟；接口接受 1～1440 的整数分钟。缺少工作量信息时，规划一轮实质性工作，返回 `scope: "first_session"`，时间表示本轮建议投入；`full_goal` 表示本轮覆盖整个目标。时间不是完成保证，服务端计算合计。此改动仅用于独立 API，前端尚未接入。

中文提示词在 [prompt.md](prompt.md)。DeepSeek JSON 模式保证 JSON 格式，步骤数量和字段要求由提示词引导并由服务端校验。超出限制直接返回错误，不截断可能缺少必要动作的计划。没有自动截图验证或存储功能。

错误返回 `{"error":"中文错误说明"}`，包括 400 输入错误、413 请求过大、415 类型错误、422 模型拒绝、502 AI 响应错误、503 配置缺失或服务限流、504 超时。此版本用于本地开发；公开部署前需另加用户认证和请求限流。

## 测试

```sh
node --test api/api.test.mjs
```

测试使用模拟模型响应，不消耗 API 额度。实际生成质量需要配置密钥后测试。

接口格式依据 [DeepSeek JSON Output](https://api-docs.deepseek.com/guides/json_mode/)。
