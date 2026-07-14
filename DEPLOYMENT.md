# 🚀 上线部署教程（24 小时公开访问）

这份教程把项目部署成一个任何人都能打开的公开网站，你的电脑关机也照常运行。

## 架构：什么放在哪里

```
用户浏览器
   │
   ├── 前端（网页界面）      →  Vercel        （免费）
   │        │
   │        ▼  调用 API / WebSocket
   └── 后端（Python 服务器）  →  Railway       （有免费额度，之后约几美元/月）
            │
            ├── Postgres 数据库  →  Railway 插件
            ├── Redis 缓存       →  Railway 插件
            └── AI 分析          →  Groq 免费云端 API
```

> **成本说明**：Vercel 前端**永久免费**。Railway 有一次性试用额度（约 $5），用完后按用量计费，这个小项目大概每月几美元。如果想让数据库也完全免费，见文末「省钱方案」。

---

## 前置准备（只做一次）

你需要三个免费账号，**全部用同一个 GitHub 账号登录**最省事：

1. **GitHub** —— 你已经有了（`jinggrace90-bit`）。代码放这里，另外两个平台从这里拉代码。
2. **Railway** —— https://railway.app ，点 "Login with GitHub"。
3. **Vercel** —— https://vercel.com ，点 "Continue with GitHub"。

还需要一个 **Groq key**（你之前已经拿过了，就是 `.env` 里那串 `gsk_...`，待会儿要用）。

> ⚠️ **安全提醒**：`.env` 文件里有你的 Groq key，它已经被设置成**不会**被推到 GitHub（在 `.gitignore` 里）。所以待会儿的 key 是直接填进 Railway 网站的，不是放进代码里。**绝不要**把 key 写进任何会上传到 GitHub 的文件。

---

## 第 0 步：把代码推到 GitHub

Vercel 和 Railway 都是从 GitHub 拉代码来部署，所以代码必须先在 GitHub 上。

具体命令我会在对话里带你一条条跑（因为要处理你的 GitHub 登录凭证）。跑完后，你的仓库
`https://github.com/jinggrace90-bit/Market-Intelligence` 里应该能看到 `web/`、`server_py/`、
`docker-compose.yml` 这些文件夹和文件。

---

## 第 1 步：部署后端到 Railway

### 1.1 创建项目
1. 打开 https://railway.app ，登录后点 **"New Project"**
2. 选 **"Deploy from GitHub repo"**
3. 选中你的仓库 **`Market-Intelligence`**（第一次用需要点 "Configure GitHub App" 授权 Railway 访问你的仓库）

### 1.2 指定后端目录
Railway 默认从仓库根目录构建，但我们的后端在 `server_py/` 子目录里，要告诉它：

1. 点进刚创建的服务（一个方块卡片）→ 顶部 **"Settings"**
2. 找到 **"Root Directory"** → 填 `server_py` → 保存
3. Railway 会自动发现 `server_py/Dockerfile` 和 `railway.json`，用 Docker 构建

### 1.3 添加数据库和缓存
1. 在项目画布空白处点 **"+ New"** → **"Database"** → **"Add PostgreSQL"**
2. 再点一次 **"+ New"** → **"Database"** → **"Add Redis"**

现在项目里有三个方块：你的后端服务、Postgres、Redis。

### 1.4 填环境变量（关键）
点进**后端服务** → 顶部 **"Variables"** 标签 → 一条条添加下面的变量：

| 变量名 | 值 | 说明 |
| --- | --- | --- |
| `DATABASE_URL` | 点 **"Add Reference"** → 选 Postgres 的 `DATABASE_URL` | 连数据库，别手打 |
| `REDIS_URL` | 点 **"Add Reference"** → 选 Redis 的 `REDIS_URL` | 连缓存，别手打 |
| `JWT_SECRET` | 随便打一长串字母数字（越长越好，如 40 位） | 登录令牌加密用 |
| `NODE_ENV` | `production` | |
| `AI_PROVIDER` | `local` | 用 Groq 而不是 Claude |
| `LOCAL_AI_BASE_URL` | `https://api.groq.com/openai/v1` | Groq 地址 |
| `LOCAL_AI_API_KEY` | `你的 gsk_... 密钥` | 从 Groq 网站复制 |
| `LOCAL_AI_MODEL` | `llama-3.3-70b-versatile` | 若报错换其他在线模型 |
| `CORS_ORIGIN` | 先填 `http://localhost:3000`，**第 3 步再改** | 允许哪个前端访问 |

> `DATABASE_URL` 和 `REDIS_URL` 一定要用 **"Add Reference"** 按钮选，不要自己复制粘贴——用引用它会自动填对内部地址。

### 1.5 生成公开网址
1. 后端服务 → **"Settings"** → 找到 **"Networking"** / **"Public Networking"**
2. 点 **"Generate Domain"**
3. 得到一个网址，形如 **`https://market-intelligence-production-xxxx.up.railway.app`**
4. **把这个网址复制下来**，下一步要用

### 1.6 验证后端活着
在浏览器打开 `你的Railway网址/api/health`，例如：
```
https://market-intelligence-production-xxxx.up.railway.app/api/health
```
看到 `{"status":"ok","time":"..."}` 就说明后端跑起来了 ✅

---

## 第 2 步：部署前端到 Vercel

### 2.1 导入项目
1. 打开 https://vercel.com ，登录后点 **"Add New..."** → **"Project"**
2. 找到你的仓库 **`Market-Intelligence`** → 点 **"Import"**

### 2.2 配置（重要）
在导入配置页：

1. **Root Directory** → 点 "Edit" → 选 **`web`**（前端在这个子目录）
2. **Framework Preset** 会自动识别为 **Next.js**，不用改
3. 展开 **"Environment Variables"**，添加一条：

| Name | Value |
| --- | --- |
| `NEXT_PUBLIC_API_URL` | 第 1.5 步的 Railway 网址（如 `https://market-intelligence-production-xxxx.up.railway.app`，**结尾不要加斜杠**） |

4. 点 **"Deploy"**，等 1-3 分钟

### 2.3 拿到前端网址
部署完成后 Vercel 给你一个网址，形如 **`https://market-intelligence-xxxx.vercel.app`**。**复制它**。

---

## 第 3 步：把前后端接起来（最容易漏，必做）

现在后端还不认识前端的网址，浏览器会因为跨域（CORS）拦截请求。要回 Railway 改一个变量：

1. 回 **Railway** → 后端服务 → **"Variables"**
2. 把 **`CORS_ORIGIN`** 的值改成第 2.3 步的 Vercel 网址，例如：
   ```
   https://market-intelligence-xxxx.vercel.app
   ```
   （结尾不要加斜杠。如果之后加了自定义域名，可以用逗号分隔填多个：`https://a.vercel.app,https://你的域名.com`）
3. Railway 会自动重新部署（约 1 分钟）

---

## ✅ 完成

打开你的 Vercel 网址 `https://market-intelligence-xxxx.vercel.app`，应该能看到：
- 实时行情、新闻、情绪、经济日历
- 注册/登录能用
- 登录后 AI 分析能用（走 Groq）

这个网站现在 24 小时在线，你电脑关机也不影响。把网址发给谁都能打开。

---

## 环境变量总清单

**Railway（后端）需要的：**
```
DATABASE_URL          → 引用 Postgres 插件
REDIS_URL             → 引用 Redis 插件
JWT_SECRET            → 一长串随机字符
NODE_ENV              = production
AI_PROVIDER           = local
LOCAL_AI_BASE_URL     = https://api.groq.com/openai/v1
LOCAL_AI_API_KEY      = 你的 Groq key
LOCAL_AI_MODEL        = llama-3.3-70b-versatile
CORS_ORIGIN           = 你的 Vercel 网址
```

**Vercel（前端）需要的：**
```
NEXT_PUBLIC_API_URL   = 你的 Railway 网址
```

---

## 常见问题排查

**网站打开是空的 / 行情不动**
→ 多半是 CORS 没配对。检查 Railway 的 `CORS_ORIGIN` 是不是**完全等于** Vercel 网址（大小写、有无 `https://`、结尾别加 `/`）。改完等 Railway 重新部署。

**登录/AI 报错，浏览器控制台显示连 `localhost:4000`**
→ Vercel 的 `NEXT_PUBLIC_API_URL` 没设或设错了。这个变量是**打包时写死**的，改完必须在 Vercel 里点 **"Redeploy"** 重新部署才生效。

**AI 分析报错 "model not found" 或类似**
→ Groq 偶尔下线旧模型。去 https://console.groq.com 看当前可用的模型 ID，把 Railway 的 `LOCAL_AI_MODEL` 换成一个在线的（如 `llama-3.1-8b-instant`），保存即可。

**后端 `/api/health` 打不开 / Railway 部署失败**
→ 点进 Railway 服务看 **"Deployments"** 里的日志。最常见是环境变量漏填（尤其 `DATABASE_URL`/`REDIS_URL` 引用没设）。

---

## 省钱方案（可选：数据库也完全免费）

如果不想为数据库/缓存付费，可以不用 Railway 的插件，改用外部免费服务：

- **Postgres → Neon**（https://neon.tech ，免费）或 **Supabase**（https://supabase.com ，免费）
  注册后建一个数据库，复制它给的连接串（`postgresql://...`），填进 Railway 的 `DATABASE_URL`（这次是手动粘贴，不用 Reference）。
- **Redis → Upstash**（https://upstash.com ，免费）
  建一个 Redis，复制 `redis://...` 连接串，填进 `REDIS_URL`。

这样 Railway 上就只剩后端一个服务，消耗的额度更少。代价是要多注册两个平台、多复制两串地址，容易填错，所以如果你不差那几美元，直接用 Railway 插件更省心。
