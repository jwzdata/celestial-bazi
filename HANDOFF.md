# Celestial Bazi 交接教程

> 把这份文档发给 WorkBuddy，它会帮你完成从零到本地运行的全部操作。

---

## 项目概况

| 项目 | 说明 |
|------|------|
| **名称** | Celestial Bazi（星曜命理） |
| **技术栈** | 纯前端（HTML/CSS/JS）+ Vercel Serverless API + Turso 云数据库 |
| **GitHub** | `https://github.com/jwzdata/celestial-bazi` |
| **生产环境** | 部署在 Vercel，每次 push 到 main 自动部署 |
| **数据库** | Turso 云 SQLite（libsql） |

### 功能
- 八字排盘、五行分析、大运流年
- 合婚、起名、抽签
- 用户注册/登录、VIP 会员、分销系统
- 海报生成（含分销二维码）

---

## 环境要求

运行本项目需要以下工具，请确认已安装：

- **Node.js** v16+（推荐 v22）
- **npm**（随 Node.js 一起安装）
- **Git**
- **Vercel CLI**（本地开发用）

如果没有安装，在终端（PowerShell）执行：

```powershell
# 检查是否已安装
node --version
npm --version
git --version
vercel --version

# 如果没有 vercel，全局安装
npm install -g vercel
```

---

## 账号信息

### GitHub 账号
- **仓库地址**: https://github.com/jwzdata/celestial-bazi
- **账号**: （填入 GitHub 用户名）
- **密码**: （填入密码或 Personal Access Token）

> 如果是首次在这台电脑上 push，Git 会要求输入凭据。
> GitHub 已不再支持密码登录，需使用 Personal Access Token（PAT）。
> 在 GitHub → Settings → Developer settings → Personal access tokens 中生成。

### Vercel 账号
- **控制台**: https://vercel.com/dashboard
- **账号**: （填入邮箱）
- **密码**: （填入密码）

### Turso 数据库
- **控制台**: https://turso.tech
- **数据库名**: （填入数据库名）
- **TURSO_DATABASE_URL**: （填入 URL）
- **TURSO_AUTH_TOKEN**: （填入 Token）

> 以上环境变量已配置在 Vercel 项目设置中，**本地开发也需要**。

### JWT 密钥
- **JWT_SECRET**: （填入你设的密钥）
- 已配置在 Vercel 环境变量中

---

## 操作步骤

### 第一步：克隆代码

```powershell
git clone https://github.com/jwzdata/celestial-bazi.git
cd celestial-bazi
```

### 第二步：安装依赖

```powershell
npm install
```

> 项目依赖仅 4 个包：@libsql/client、bcryptjs、jsonwebtoken、uuid。
> 无需原生编译，直接安装即可。

### 第三步：配置环境变量

复制模板并填入真实值：

```powershell
cp .env.example .env
```

然后编辑 `.env`，填入以下内容：

```env
TURSO_DATABASE_URL=libsql://你的数据库名.turso.io
TURSO_AUTH_TOKEN=你的token
JWT_SECRET=你的密钥
```

### 第四步：本地启动

```powershell
vercel dev
```

首次运行会要求登录 Vercel 账号，按提示操作即可。

启动成功后访问 `http://localhost:3000`。

### 第五步：确认数据库

本地首次访问时，`_db.js` 会自动创建 `users` 和 `orders` 两张表。
如果用的是 Turso 云数据库（`.env` 中配置了 URL），表会在云端自动建好。
如果没配 `.env`，会 fallback 到本地文件 `bazi.db`。

---

## 日常开发流程

### 修改代码

项目结构：

```
celestial-bazi/
├── public/              ← 前端文件（HTML/CSS/JS）
│   ├── index.html       ← 主页面
│   ├── css/style.css    ← 样式
│   └── js/              ← 前端 JS（app.js / bazi.js / data.js / auth.js / i18n.js）
├── api/                 ← 后端 API（Vercel Serverless Functions）
│   ├── _db.js           ← 数据库连接
│   ├── register.js      ← 注册接口
│   ├── login.js         ← 登录接口
│   ├── user.js          ← 用户信息接口
│   └── pay/             ← 支付相关
├── vercel.json          ← Vercel 配置
└── package.json         ← 依赖声明
```

### 本地预览

修改代码后，`vercel dev` 会自动热重载前端文件。
如果修改了 `api/` 下的文件，保存后会自动重新加载函数。

### 提交并推送

```powershell
# 查看改了什么
git status
git diff

# 暂存所有改动
git add -A

# 提交
git commit -m "描述你做了什么"

# 推送到 GitHub
git push
```

推送后 Vercel 会自动部署到生产环境（约 1-2 分钟）。

---

## 常见问题

### Q: `vercel dev` 启动失败
确保 Vercel CLI 已安装（`npm install -g vercel`）且已登录（`vercel login`）。

### Q: 数据库连接失败
检查 `.env` 中的 `TURSO_DATABASE_URL` 和 `TURSO_AUTH_TOKEN` 是否正确。
可以不带这两个变量运行，会自动 fallback 到本地 `bazi.db` 文件。

### Q: Git push 要求输入密码但密码不对
GitHub 已不支持密码登录，需要使用 Personal Access Token（PAT）：
1. 打开 https://github.com/settings/tokens
2. 生成新 token，勾选 `repo` 权限
3. 在 push 时用 token 作为密码

### Q: 前端页面空白 / JS 报错
打开浏览器开发者工具（F12）查看 Console 中的错误信息。
常见原因：修改 JS 时引入了语法错误。

### Q: 如何重置数据库
删除项目根目录下的 `bazi.db` 文件，重启服务即可自动重建。
如果是 Turso 云数据库，需要手动连接 Turso CLI 执行 SQL。

---

## 给 WorkBuddy 的指令

如果你是接手人，把以下内容直接发给 WorkBuddy：

---

**请帮我完成以下操作：**

1. 克隆代码：`git clone https://github.com/jwzdata/celestial-bazi.git` 到 `D:\AI\celestial-bazi`（或你想要的路径）
2. 进入项目目录，安装依赖：`npm install`
3. 创建 `.env` 文件，内容如下：
   ```
   TURSO_DATABASE_URL=（填入实际值）
   TURSO_AUTH_TOKEN=（填入实际值）
   JWT_SECRET=（填入实际值）
   ```
4. 安装 Vercel CLI（如果没有）：`npm install -g vercel`
5. 启动本地开发服务：`vercel dev`
6. 告诉我访问地址，我确认能否正常打开

之后修改代码时，我会告诉你要改什么。改完后帮我执行：
```powershell
git add -A
git commit -m "描述改动内容"
git push
```

---

_文档生成时间：2026-04-21_
