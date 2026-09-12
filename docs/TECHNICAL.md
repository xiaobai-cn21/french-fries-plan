# 薯条计划 FryPlan 技术文档

## 1. 项目概述

薯条计划（FryPlan）是一个移动端优先的专注与任务启动网站。用户可以创建一个较大的目标，系统将目标转化为更容易开始的“小薯条”任务；用户完成专注计时后上传截图作为成果凭证，系统记录进度、能量和连续完成天数。

项目主体是静态前端，使用原生 HTML、CSS、JavaScript 和 SVG/Web Component 实现，不依赖前端构建工具。AI 能力由可选的本地或远程 API 提供，当前包含 Node.js 与 Python 两套后端实现。

## 2. 技术栈

| 层级 | 技术 |
| --- | --- |
| 前端 | HTML、CSS、Vanilla JavaScript、SVG、Web Components |
| 本地数据 | `localStorage`、IndexedDB |
| Node API | Node.js 22.17+ / 24+，内置 `node:http`、`fetch` |
| Python API | Python 标准库 `http.server`、`urllib` |
| AI 服务 | DeepSeek Chat Completions API，JSON Output |
| 测试 | Node.js `node --test`、Python 脚本测试 |
| 静态部署 | GitHub Pages + GitHub Actions |

## 3. 目录结构

```text
.
├── index.html                     # 首页：任务薯条盒、统计、分类入口
├── pages/                         # 业务页面
│   ├── goal.html                  # 创建目标
│   ├── first-fry.html             # 首根薯条确认
│   ├── select-fries.html          # AI 生成/选择开始薯条
│   ├── focus.html                 # 专注计时
│   ├── upload.html                # 上传成果截图
│   ├── success.html               # 完成反馈
│   ├── companion.html             # 伙伴与成长统计
│   ├── profile.html               # 个人资料与历史截图
│   └── art-studio.html            # 视觉组件预览
├── assets/
│   ├── css/                       # 页面样式
│   ├── js/                        # 前端状态、计时、API、视觉组件逻辑
│   └── images/                    # 页面图片与薯条素材
├── api/
│   ├── server.mjs                 # Node.js API 入口
│   ├── fryplan-api.mjs            # FryPlan AI API 业务处理
│   ├── planner.mjs                # /api/steps 任务拆解逻辑
│   ├── server.py                  # Python API 入口
│   ├── deepseek_client.py         # Python DeepSeek 客户端
│   ├── api.test.mjs               # Node API 单元测试
│   └── prompt.md                  # /api/steps 提示词
├── scripts/
│   └── build_pages.py             # GitHub Pages 静态构建脚本
├── docs/                          # 产品与技术文档
└── fries-widget/                  # 可独立使用的薯条悬浮组件
```

## 4. 前端页面流程

核心用户路径如下：

```text
index.html
  -> pages/goal.html
  -> pages/first-fry.html
  -> pages/select-fries.html
  -> pages/focus.html
  -> pages/upload.html
  -> pages/success.html
```

主要页面职责：

| 页面 | 职责 |
| --- | --- |
| `index.html` | 展示未完成任务薯条、能量、连续天数、分类入口和底部导航 |
| `pages/goal.html` | 输入目标，调用 AI 估算耗时；失败时使用本地估算规则 |
| `pages/first-fry.html` | 承接待创建目标，生成第一个可启动任务 |
| `pages/select-fries.html` | 根据大目标生成 3 根开始薯条，用户选择后进入专注 |
| `pages/focus.html` | 管理计时器、暂停/继续、环境音和完成弹窗 |
| `pages/upload.html` | 读取截图，调用图片校验 API，写入完成记录 |
| `pages/success.html` | 展示完成反馈并奖励能量 |
| `pages/companion.html` | 汇总用户成长、能量和行动统计 |
| `pages/profile.html` | 展示历史截图、昵称和外观设置 |
| `pages/art-studio.html` | 预览 `<fry-art>` 视觉组件的不同状态 |

## 5. 前端核心模块

| 文件 | 说明 |
| --- | --- |
| `assets/js/api-client.js` | 封装前端到 API 的请求，默认调用 `http://127.0.0.1:3001` |
| `assets/js/tasks.js` | 管理任务列表、随机抽取、任务选择和计时快照 |
| `assets/js/progress.js` | 从 IndexedDB 读取完成记录，并计算完成数、能量、连续天数 |
| `assets/js/focus.js` | 专注计时器主逻辑，负责持久化当前 session |
| `assets/js/step-proof.js` | 分步任务截图凭证保存，使用 IndexedDB 事务保证顺序一致 |
| `assets/js/fry-art.js` | 定义可复用 `<fry-art>` Web Component |
| `assets/js/task-carton.js` | 首页任务薯条盒渲染和可访问抽取按钮 |
| `assets/js/goal.js` | 目标输入、建议目标、AI/本地耗时估算 |
| `assets/js/select-fries.js` | 生成并选择开始薯条 |

## 6. 本地数据模型

项目没有账号系统，所有用户数据均保存在当前浏览器与当前 origin 下。

### localStorage

| Key | 用途 |
| --- | --- |
| `fryplan-tasks-v1` | 保存任务列表、任务配置和计时 session 快照 |
| `fryplan-focus` | 当前专注 session |
| `fryplan-goal` | 目标输入草稿 |
| `fryplan-pending-goal` | 从目标页传递到首根薯条页的待创建目标 |
| `fryplan-api-base` | 可选 API Base URL 覆盖值 |

`assets/js/tasks.js` 会在首次读取时尝试从旧版 `fryplan-focus` 导入一个未完成任务。完成记录是判断任务是否仍可用的权威来源。

### IndexedDB

数据库名：`fryplan-evidence`

对象仓库：`records`

主要记录字段：

| 字段 | 说明 |
| --- | --- |
| `id` / `taskId` | 任务 ID |
| `goal` | 任务标题 |
| `status` | `in_progress` 或 `completed` |
| `createdAt` | 首次记录时间 |
| `completedAt` | 完成时间 |
| `reward` | 完成奖励，通常为 3 |
| `evidence` | 上传截图文件 |
| `duration` | 已投入时长，毫秒 |
| `stepProofs` | 分步任务每一步的截图凭证数组 |
| `verification` | AI 图片校验结果 |

## 7. API 设计

前端通过 `assets/js/api-client.js` 调用 API。默认地址为：

```text
http://127.0.0.1:3001
```

可以在浏览器控制台覆盖：

```js
localStorage.setItem('fryplan-api-base', 'https://your-api-domain.example')
```

### POST /api/estimate-time

估算大目标完成所需净专注时长。

请求：

```json
{"goal":"写论文第三章"}
```

响应：

```json
{"time":"3小时"}
```

校验规则：

- `goal` 必须为 1 到 200 字。
- `time` 只允许 `分钟` 或 `小时`，小时最多一位小数。

前端容错：

- API 不可用时，`pages/goal.html` 会使用本地关键词和显式时长解析规则估算分钟数。

### POST /api/start-fries

根据大目标生成 3 根 10 分钟以内的开始薯条。

请求：

```json
{"goal":"整理参考文献"}
```

响应：

```json
{
  "fries": [
    {"title":"打开文献文件","time":"3分钟"},
    {"title":"列出三篇标题","time":"5分钟"},
    {"title":"补全出处信息","time":"10分钟"}
  ]
}
```

校验规则：

- 必须返回 3 项。
- `title` 不超过 15 字。
- `time` 必须为 `1分钟` 到 `10分钟`。

### POST /api/verify-photo

校验截图是否能证明任务完成。

请求：

```json
{
  "goal": "整理三篇参考文献",
  "image": "data:image/png;base64,..."
}
```

响应：

```json
{
  "related": true,
  "score": 88,
  "passed": true,
  "summary": "图片是一份参考文献列表。",
  "evaluation": "与任务对应，三篇文献信息较完整。",
  "message": "三篇文献整理得很清楚。"
}
```

校验规则：

- 图片必须是 PNG 或 JPG 的 Data URL。
- 图片请求体上限约 14.5 MB，前端业务要求图片不超过 10 MB。
- `score` 为 0 到 100 的整数。
- `passed = related && score >= 60`。

### POST /api/steps

保留的独立任务拆解接口，目前 README 标注“前端尚未接入”。

请求：

```json
{
  "topic": "给论文第三章写三个粗略要点",
  "context": "电脑已打开，使用 Word，论文文档已存在"
}
```

响应：

```json
{
  "outcome": "在第三章写下并保存三个粗略要点",
  "scope": "full_goal",
  "steps": [
    {"title":"用 Word 打开论文文档","minutes":1},
    {"title":"定位到第三章的正文","minutes":1},
    {"title":"写下三个想表达的粗略要点","minutes":3},
    {"title":"保存文档","minutes":1}
  ],
  "totalMinutes": 6
}
```

## 8. 后端实现

### Node.js API

入口文件：`api/server.mjs`

特点：

- 使用 `node:http` 创建服务，不需要安装 npm 依赖。
- 默认监听 `127.0.0.1:3001`。
- 所有路由只接受 `POST` 和 `application/json`。
- 统一返回 JSON，并设置宽松 CORS 头，方便 GitHub Pages 前端调用。
- `/api/verify-photo` 使用更大的请求体限制，其余接口限制为 8 KB。

启动：

```powershell
Copy-Item api/.env.example api/.env
node --env-file=api/.env api/server.mjs
```

### Python API

入口文件：`api/server.py`

特点：

- 使用 Python 标准库实现，不需要安装依赖。
- 默认监听 `0.0.0.0:$PORT`，未设置 `PORT` 时使用 `3001`。
- 适合部署到支持 Python Web 服务的平台。

启动：

```powershell
$env:DEEPSEEK_API_KEY="your-api-key"
$env:DEEPSEEK_MODEL="deepseek-flash"
$env:DEEPSEEK_VISION_MODEL="deepseek-flash"
python api/server.py
```

### 环境变量

| 变量 | 必填 | 说明 |
| --- | --- | --- |
| `DEEPSEEK_API_KEY` | 是 | DeepSeek API Key |
| `DEEPSEEK_MODEL` | 否 | 文本模型，默认 `deepseek-flash` |
| `DEEPSEEK_VISION_MODEL` | 否 | 图片校验模型，未设置时沿用 `DEEPSEEK_MODEL` |
| `PORT` | 否 | API 端口，默认 `3001` |
| `HOST` | 否 | Python API 监听地址，默认 `0.0.0.0` |

## 9. 构建与部署

### 本地静态运行

直接打开 `index.html` 即可运行大部分页面。为了获得稳定的同源存储行为，推荐使用本地 HTTP 服务：

```sh
python -m http.server 8000
```

访问：

```text
http://localhost:8000
```

### GitHub Pages

项目包含 `.github/workflows/pages.yml`。推送到 `main` 时，GitHub Actions 会：

1. Checkout 仓库。
2. 设置 Python 3.12。
3. 执行 `python scripts/build_pages.py`。
4. 将 `_site/` 上传为 Pages artifact。
5. 部署到 GitHub Pages。

`scripts/build_pages.py` 会复制以下静态资源：

```text
index.html
pages/
assets/
docs/
fries-widget/
fries-widget.zip
```

GitHub Pages 只能托管静态前端，不能运行 `api/` 服务。线上 AI 能力需要将 Node 或 Python API 单独部署到 Render、Railway、Fly.io 等平台，并在前端设置 `fryplan-api-base`。

## 10. 测试

### Node API 测试

```sh
node --test api/api.test.mjs
```

测试使用模拟模型响应，不消耗 API 额度。

### Python 提示词实测脚本

仓库根目录下包含：

```text
test_estimate_time.py
test_start_fries.py
test_verify_photo.py
```

这些脚本会调用真实 DeepSeek API，用于验证提示词效果和模型可用性。运行前需要配置 `DEEPSEEK_API_KEY`，图片校验脚本还需要本地存在对应测试图片。

## 11. 安全与隐私

- API Key 只应放在服务端环境变量或 `api/.env` 中，不能写入前端代码。
- `api/.env` 已通过 `.gitignore` 忽略。
- 本地浏览器数据不上传到账户系统，也不跨设备同步。
- 截图会保存到 IndexedDB；清除浏览器站点数据会删除任务记录和截图。
- 当前 API 没有认证、用户隔离或请求限流；公开部署前需要补充鉴权、限流、日志脱敏和滥用防护。
- CORS 当前为 `Access-Control-Allow-Origin: *`，公开生产环境可按实际域名收紧。

## 12. 维护建议

- 修改页面交互时，优先检查 `assets/js/tasks.js`、`assets/js/progress.js` 和 `assets/js/focus.js` 的状态约定。
- 修改完成判定时，需要同时关注 `upload.html` 页面逻辑、`/api/verify-photo` 返回结构和 IndexedDB `records` 写入格式。
- 修改分步任务时，需要保持 `stepIndex`、`stepProofs.length` 和 `status` 的顺序一致性。
- 新增静态资源目录后，需要同步更新 `scripts/build_pages.py` 的 `STATIC_PATHS`，否则 GitHub Pages 产物不会包含它。
- 前端是无构建项目，新增脚本时注意 HTML 中的加载顺序，尤其是依赖 `FryProgress`、`FryTasks`、`FryPlanApi` 的页面。
