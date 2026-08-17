# 🚀 上线部署教程（完全免费，24 小时公开访问）

把项目部署成一个任何人都能打开的公开网站，你的电脑关机也照常运行。**全程免费**。

## 架构：什么放在哪里

```
用户浏览器
   │
   ├── 前端（网页界面）      →  Vercel                （免费）
   │        │
   │        ▼  调用 API / WebSocket
   └── 后端（Python 服务器）  →  Render                 （免费）
            │
            ├── Postgres 数据库  →  Neon                （免费，永久）
            ├── Redis 缓存       →  不用（代码会自动跳过）
            └── AI 分析          →  Groq 免费云端 API
```

> **Render 免费版的唯一缺点**：闲置 15 分钟会休眠，下次有人访问要等约 30-60 秒"唤醒"，唤醒后就正常了。对个人项目完全够用。

---

## 前置准备（用同一个 GitHub 账号登录最省事）

你需要这几个免费账号：

1. **GitHub** —— 已有（`jinggrace90-bit`），代码已经在 `Market-Intelligence` 仓库里了。
2. **Neon** —— https://neon.tech （数据库）
3. **Render** —— https://render.com （后端）
4. **Vercel** —— https://vercel.com （前端，你已经注册了）

还需要你的 **Groq key**（就是 `.env` 里那串 `gsk_...`）。

> ⚠️ **安全**：Groq key 是直接填进 Render 网站的，**绝不要**写进任何会上传 GitHub 的文件。

---

## 第 1 步：建免费数据库（Neon）

1. 打开 https://neon.tech ，点 **"Sign up"**，用 GitHub 登录
2. 登录后它会引导你 **"Create a project"**（或点 "New Project"）
   - Project name 随便填（如 `market-intelligence`）
   - Region 选离你近的（如 `AWS US East` 或 `Asia`）
   - 点 **"Create"**
3. 建好后它会显示一个 **Connection string（连接字符串）**，形如：
   ```
   postgresql://neondb_owner:npg_xxxxx@ep-xxxx.ap-southeast-1.aws.neon.tech/neondb?sslmode=require
   ```
4. **重要**：如果连接串上方有 **"Pooled connection"（连接池）** 的开关，把它**关掉**，用直连的那个（host 里**不带** `-pooler` 的）。
5. 点旁边的**复制按钮**，把这串完整复制下来 —— 第 2 步要用。

---

## 第 2 步：部署后端到 Render

### 2.1 创建服务
1. 打开 https://render.com ，点 **"Get Started"**，用 GitHub 登录
2. 进控制台后点 **"New +"** → **"Web Service"**
3. 选 **"Build and deploy from a Git repository"** → **"Next"**
4. 找到 **`Market-Intelligence`** 仓库 → 点 **"Connect"**（第一次要点 "Configure account" 授权 Render 访问你的仓库）

### 2.2 填配置
在配置页填：

| 项目 | 填什么 |
| --- | --- |
| **Name** | 随便，如 `market-intelligence-api` |
| **Root Directory** | `server_py` ← **关键！后端在这个子目录** |
| **Runtime / Language** | 选 **Docker**（一般会自动识别到 `server_py/Dockerfile`） |
| **Instance Type** | 选 **Free** |

### 2.3 填环境变量
往下滚到 **"Environment Variables"**，点 **"Add Environment Variable"** 一条条加：

| Key（变量名） | Value（值） |
| --- | --- |
| `DATABASE_URL` | 第 1 步复制的 Neon 连接串（整串粘贴） |
| `JWT_SECRET` | 随便打一长串字母数字（越长越好，如 40 位） |
| `NODE_ENV` | `production` |
| `AI_PROVIDER` | `local` |
| `LOCAL_AI_BASE_URL` | `https://api.groq.com/openai/v1` |
| `LOCAL_AI_API_KEY` | 你的 `gsk_...` Groq 密钥 |
| `LOCAL_AI_MODEL` | `openai/gpt-oss-120b` |
| `CORS_ORIGIN` | 先填 `http://localhost:3000`，**第 4 步再改** |

> **不用填 `REDIS_URL`** —— 不设它，程序会自动跳过缓存、正常运行。

### 2.4 创建 + 等待
点最下面 **"Create Web Service"**（或 "Deploy Web Service"）。Render 会开始构建，**第一次约 5-10 分钟**（要装 Python 依赖）。

构建日志里看到 `Running upgrade  -> 0001_initial`（建表）和 `Uvicorn running on ...` 就说明起来了。

### 2.5 拿到后端网址 + 验证
1. 页面顶部会显示你的后端网址，形如 **`https://market-intelligence-api-xxxx.onrender.com`**，**复制它**
2. 在浏览器打开 `你的Render网址/api/health`，例如：
   ```
   https://market-intelligence-api-xxxx.onrender.com/api/health
   ```
3. 看到 `{"status":"ok","time":"..."}` 就成功了 ✅（第一次可能要等几十秒唤醒）

---

## 第 3 步：修好并部署前端到 Vercel

你之前 Vercel 显示 404，是因为 **Root Directory 没设成 `web`**。现在一起修好。

1. 打开你的 Vercel 项目 → 左侧 **"Settings"** → **"Build and Deployment"**
2. 找到 **"Root Directory"** → 点 "Edit" → 填 **`web`** → 保存
3. 左侧 **"Environment Variables"** → 添加一条：
   - Key: `NEXT_PUBLIC_API_URL`
   - Value: 第 2.5 步的 Render 网址（如 `https://market-intelligence-api-xxxx.onrender.com`，**结尾不要加斜杠**）
   - 保存
4. 左侧 **"Deployments"** → 最新那条右边 **"⋯"** → **"Redeploy"** → 确认

> 如果是新建 Vercel 项目：Import 时把 **Root Directory 设成 `web`**、加上面那个环境变量，再 Deploy。

部署完成后得到前端网址，形如 **`https://market-intelligence-xxxx.vercel.app`**，复制它。

---

## 第 4 步：把前后端接起来（最容易漏，必做）

后端现在还不认识前端网址，浏览器会因跨域（CORS）拦截请求。回 Render 改一个变量：

1. 回 **Render** → 你的后端服务 → 左侧 **"Environment"**
2. 把 **`CORS_ORIGIN`** 的值改成第 3 步的 Vercel 网址，例如：
   ```
   https://market-intelligence-xxxx.vercel.app
   ```
   （结尾不要加斜杠。以后加自定义域名，可用逗号分隔填多个）
3. 保存 → Render 会自动重新部署（约 1-2 分钟）

---

## ✅ 完成

打开你的 Vercel 网址，应该能看到实时行情、新闻、情绪、经济日历；注册/登录能用；登录后 AI 分析能用（走 Groq）。这个网站现在 24 小时在线，你电脑关机也不影响。

---

## 环境变量总清单

**Render（后端）：**
```
DATABASE_URL        = Neon 连接串（带 ?sslmode=require）
JWT_SECRET          = 一长串随机字符
NODE_ENV            = production
AI_PROVIDER         = local
LOCAL_AI_BASE_URL   = https://api.groq.com/openai/v1
LOCAL_AI_API_KEY    = 你的 Groq key
LOCAL_AI_MODEL      = openai/gpt-oss-120b
CORS_ORIGIN         = 你的 Vercel 网址
（不设 REDIS_URL）
```

**Vercel（前端）：**
```
NEXT_PUBLIC_API_URL = 你的 Render 网址
```

---

## 常见问题排查

**Vercel 打开还是 404**
→ Root Directory 没设成 `web`，或改了没重新部署。改完必须去 Deployments 点 Redeploy。

**网站能打开但行情/新闻是空的、一直转圈**
→ 多半是 CORS 没配对。检查 Render 的 `CORS_ORIGIN` 是否**完全等于** Vercel 网址（大小写、`https://`、结尾别加 `/`）。

**浏览器控制台显示请求还在连 `localhost:4000`**
→ Vercel 的 `NEXT_PUBLIC_API_URL` 没设或设错。这个是打包时写死的，改完必须 **Redeploy**。

**后端 `/api/health` 打不开 / Render 部署失败**
→ 进 Render 服务看 **"Logs"**。最常见：
  - 连不上数据库 → `DATABASE_URL` 粘错了，或用了带 `-pooler` 的连接池地址（换成直连）。
  - `out of memory`（内存不够）→ 这个应用对 512MB 偏紧。告诉我，我帮你换到 Fly.io（内存可调大）。

**第一次访问很慢（30-60 秒）**
→ 正常。Render 免费版闲置会休眠，第一次访问在唤醒，之后就快了。

**AI 分析显示 "unavailable" / "local AI server not reachable"**
→ 最常见的原因是 **Groq 下线了你在用的模型**。Groq 会提前几个月邮件通知后停用旧模型，到期当天调用就会直接失败。
  - 去 https://console.groq.com/docs/models 看当前可用模型
  - 把 Render 的 `LOCAL_AI_MODEL` 改成 **Production（生产级）** 列表里的一个，例如 `openai/gpt-oss-120b`
  - **不要选 Preview 列表里的**——那些随时可能再次被下线，等于埋同样的雷
  - 改完保存，Render 会自动重新部署

> 已知停用记录：`llama-3.3-70b-versatile` 和 `llama-3.1-8b-instant` 于 **2026-08-16** 停用。

其他可能的错误信息：
| 错误内容 | 原因 |
| --- | --- |
| `set ANTHROPIC_API_KEY` | `AI_PROVIDER` 不等于 `local`（变量没设或拼错）|
| `local AI provider not configured` | `LOCAL_AI_API_KEY` 是空的 |
| `local AI server not reachable` | 模型已下线 / key 失效 / 触发限流 |

---

## 想更新线上代码怎么办？

以后你改了代码，推到 GitHub 后 Render 和 Vercel 会**自动重新部署**：
```
git push deploy HEAD:main
```
（`deploy` 是指向 `Market-Intelligence` 仓库的远程）
