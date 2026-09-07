# elo 打卡

一个以“个人自我管理”为核心的打卡工具：坚持小目标（学习、早睡、运动、自定义习惯），用看得见的记录鼓励自己持续进步。当前对外发布的版本为 Android App（微信小程序已停更）。

- 前端：uni-app + Vue 3 + Vite（可发布微信小程序 / H5 / Android App）
- 后端：纯 Node.js + 内置 `node:sqlite`（零第三方依赖，需 Node 22+）
- 部署：GitHub Actions 构建镜像 → ghcr.io → Sealos 运行

<p align="center"><img src="src/static/app-icon-final.png" width="180" alt="elo 打卡 App 图标"></p>

---

## 文档导航（新手从这里开始）

- [部署全流程解析（从零到上线，小白版）](DEPLOY-GUIDE.md)
- [本地部署与给别人部署指南](LOCAL-DEPLOY.md)
- [模板框架提炼（代码结构拆解，改功能指南）](TEMPLATE-GUIDE.md)
- [项目笔记与发布复盘](PROJECT.md)
- [后端接口文档](backend-api.md)
- [App 安装与使用说明（可直接转发）](INSTALL-GUIDE.md)

---

## 功能特性

- 账号注册 / 登录，支持邮箱或手机号格式账号
- 登录页“记住密码”（本地 AES 加密存储）
- 打卡目标：每天 / 每周 N 次 / 指定周几，支持提醒时间
- 今日打卡、取消打卡、连续坚持天数
- 打卡率与趋势统计（本月 / 上月 / 本年）
- 账号与安全：修改密码（旧密码校验）、退出登录
- 管理员工具：用户列表、查看目标完成与打卡记录、重置密码、删除用户
- Android 系统级本地通知：按时提醒 / 风险提醒 / 成就提醒（可开关）
- App 内版本检查与更新（后端登记最新版与下载地址）

---

## 技术栈与目录

| 端 | 技术 |
| --- | --- |
| 小程序 / H5 / App | uni-app 3.0 + Vue 3 + Vite |
| 后端 | Node.js（`node:http` + `node:sqlite`） |
| 数据库 | SQLite（文件：`server/data/elo.db`） |
| 部署 | GitHub Actions + ghcr.io + Sealos |

```text
.
├── src/                         # uni-app 前端源码
│   ├── pages/                   # 页面（登录、注册、打卡、账号与安全、管理员等）
│   ├── utils/request.js         # 统一请求封装（自动携带 Bearer token）
│   ├── utils/api-config.js      # 后端接口地址配置
│   ├── static/                  # 静态资源（App 图标等）
│   ├── pages.json               # 页面路由
│   └── manifest.json            # 多端应用配置
├── server/                      # Node 后端
│   ├── index.js                 # HTTP 入口与路由
│   ├── auth.js                  # 注册 / 登录 / 密码哈希 / 会话
│   ├── admin.js                 # 管理员接口
│   ├── goals.js / checkins.js   # 目标与打卡
│   ├── statistics.js            # 统计
│   ├── db.js                    # SQLite 初始化
│   └── Dockerfile
├── DEPLOY-GUIDE.md              # 部署全流程解析（小白版）
├── TEMPLATE-GUIDE.md            # 模板框架提炼
├── PROJECT.md                   # 项目笔记与流程复盘
├── backend-api.md               # 接口文档
└── archive/                     # 历史原型与设计过程稿（不再参与构建）
```

---

## 本地开发

### 前端

```bash
npm install

# H5 调试
npm run dev:h5

# 微信小程序（历史能力，已停更）
npm run dev:mp-weixin
npm run build:mp-weixin

# App：用 HBuilderX CLI 导出资源与云打包，见下方“发布流程 → Android App”
```

后端接口地址在 `src/utils/api-config.js` 中配置，默认指向 Sealos 线上地址。

### 后端

需要 Node.js 22+（依赖 `node:sqlite`）：

```bash
cd server
npm start          # 默认 http://localhost:3000
```

环境变量：

| 变量 | 说明 |
| --- | --- |
| `PORT` | 监听端口，默认 `3000` |
| `ADMIN_ACCOUNTS` | 管理员账号，逗号分隔；生产环境建议显式配置 |

本地健康检查：`GET http://localhost:3000/v1/health`

---

## 管理员

- 管理员身份由后端 `ADMIN_ACCOUNTS` 环境变量决定，按登录账号精确匹配；
- 管理员接口全部要求 Bearer token 且账号具备管理员权限；
- 管理员支持：查看全部用户、查看某用户目标完成与打卡记录、重置密码（生成临时密码）、删除用户（级联清理）。

---

## 发布流程

### 后端

1. 修改 `server/` 下的代码并提交；
2. push 到 GitHub，触发 Actions 自动构建并推送 `ghcr.io/hywwz/elo-backend:latest`；
3. 到 Sealos 控制台对 `elo-backend` 执行一次“变更 → 保存”，拉取最新镜像。

### 微信小程序（历史能力，已停更）

```bash
npm run build:mp-weixin
```

在微信开发者工具导入 `dist/build/mp-weixin`，上传新版本并在公众平台“版本管理”中选为体验版。

### Android App（当前主链路）

打包使用源码工程根目录 + HBuilderX CLI：

```text
cli.exe publish app --type appResource --project <项目根>
cli.exe pack --config .pack-release.json
```

打包配置为云端证书、包名 `com.elo.checkin`、targetSdk 34；APK 下载后保存到 `dist/release/`。

安装与使用者的操作说明：见 [INSTALL-GUIDE.md](INSTALL-GUIDE.md)。

App 图标（E + 打勾 设计稿）已配置在 `src/manifest.json` → `app-plus.distribute.icons.android`，对应多分辨率图标文件：

- 源图：`src/static/app-icon-final.png`（1024×1024）
- 打包用图：`src/static/app-icon-48/72/96/144/192.png`（Android mdpi → xxxhdpi）

更换图标时，替换以上文件或在 HBuilderX 可视化界面中重新选择即可。

---

## 接口一览

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| POST | `/v1/auth/register` | 注册 |
| POST | `/v1/auth/login` | 登录 |
| POST | `/v1/auth/logout` | 退出登录 |
| POST | `/v1/auth/change-password` | 修改密码（需旧密码） |
| GET | `/v1/users/me` | 当前用户 |
| GET | `/v1/goals?date=YYYY-MM-DD` | 目标列表 |
| POST | `/v1/goals` | 新建目标 |
| GET/PUT/DELETE | `/v1/goals/{id}` | 目标详情 / 修改 / 删除 |
| POST | `/v1/checkins` | 打卡 |
| DELETE | `/v1/checkins/today` | 取消今日打卡 |
| GET | `/v1/statistics?period=...` | 统计 |
| GET | `/v1/admin/users` | 管理员：用户列表 |
| GET | `/v1/admin/users/{id}/records` | 管理员：打卡记录 |
| POST | `/v1/admin/users/{id}/reset-password` | 管理员：重置密码 |
| DELETE | `/v1/admin/users/{id}/delete` | 管理员：删除用户 |

完整字段与示例见 [backend-api.md](backend-api.md)。

---

## 版本

- `v1.0.0`：微信小程序体验版首发，Sealos 后端 + Android APK
- `v1.0.1`：记住密码、账号与安全页、修改/退出、管理员查看 / 重置 / 删除用户、App 正式图标（E + 打勾）
- `v1.0.2`：自研本地定时通知插件、三类系统提醒接入、提醒设置开关、targetSdk 34
- `v1.0.3`：系统原生时间滚轮、输入框对齐、账号页间距、更新接口上线、GitHub Releases 分发

详细项目笔记与发布流程复盘见 [PROJECT.md](PROJECT.md)。
