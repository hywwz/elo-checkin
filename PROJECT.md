# elo 打卡 · 项目笔记与完整文档

> 一个以"个人自我管理"为核心的打卡小程序/App。
> 从 HTML 高保真原型 → uni-app 前端 → Node 后端 → Sealos 线上部署 → 微信体验版 → Android APK，完整走通。

---

## 1. 项目一句话

**elo 打卡**：帮助自己坚持小目标（学习、早睡、运动、自定义习惯）的个人自我管理工具。
设计风格：绿色渐变 + 简洁清爽；核心体验是"主页一屏打卡、统计可见进步"。

---

## 2. 当前状态（2026-09-06）

| 项目 | 状态 | 地址/说明 |
| --- | --- | --- |
| GitHub 仓库 | ✅ 已保存 | https://github.com/hywwz/elo-checkin |
| 后端（Sealos） | ✅ 运行中 | https://cywspqlnlffd.cloud.sealos.io |
| 微信小程序 | ✅ 体验版 1.0.0 | 已添加体验成员 |
| Android App | ✅ APK 已打包 | `dist/build/app/unpackage/release/apk/H5680A95B__20260906032340.apk` |
| 本地代码 | ✅ 干净可构建 | master 分支，最新 commit：`4d2cf39` |
| 接口文档 | ✅ | [backend-api.md](backend-api.md) |

---

## 3. 技术栈与结构

### 3.1 前端

- uni-app + Vue 3 + Vite（同一个项目可出：微信小程序 / H5 / Android App）
- uni-app SDK 版本：`3.0.0-5020420260813003`，对应 HBuilderX 5.24
- 源码位置：`src/`

```text
src/
├─ pages/
│  ├─ login/       登录
│  ├─ register/    注册（账号、密码、可选昵称）
│  ├─ checkin/     打卡主页（今日任务、真实连续天数）
│  ├─ set-goal/    设置打卡目标
│  ├─ edit-goal/   修改打卡目标
│  └─ statistics/  统计（本月/上月/今年）
├─ utils/
│  ├─ request.js   统一请求封装
│  └─ api-config.js  接口地址配置（当前指向 Sealos）
├─ static/         静态资源
├─ pages.json      页面路由
├─ manifest.json   多端配置
└─ App.vue / main.js
```

### 3.2 后端

- 纯 Node.js（内置 `http`），数据库用 **Node 内置 SQLite**（`node:sqlite`，需要 Node 22+）
- 零第三方依赖，文件都在 `server/`
- 业务模块：`auth / goals / checkins / statistics / time / db`
- SQLite 数据文件：`server/data/elo.db`（本地）

### 3.3 交付物原型

项目根目录保留了最早设计沟通用的高保真 HTML 原型：
`login-prototype.html`、`register-prototype.html`、`checkin-prototype.html`、
`set-goal-prototype.html`、`edit-goal-prototype.html`、`statistics-prototype.html`

---

## 4. 功能清单

### 4.1 账号

- 注册：账号 + 密码（≥8 位）+ **可选昵称**（不填默认用账号前缀）
- 登录：账号 + 密码；登录后 token 存本地

### 4.2 打卡目标

- 目标名称（学习 / 早睡 / 运动 / 自定义）
- **具体任务**（不只是"学习"，而是"背 30 个单词"这类可执行任务）
- 打卡频率：
  - 每天 1 次
  - 每周 N 次（弹性，本周内任意天完成即可）
  - 固定每周某几天
- 每日提醒时间（精确到分钟，可自由选择）
- 支持修改、查看当前修改的是哪个目标

### 4.3 打卡主页

- 按时段变化的问候语 + 真实昵称
- 展示今天"该打卡"的目标（非固定日不出现）
- 点击圆圈打卡 / 再点取消；打卡后主页勾选即时刷新
- **真实连续坚持天数**（不再是写死的"12 天"）

### 4.4 统计

- 本月 / 上月 / 今年切换
- **打卡率 = 实际打卡次数 ÷ 到当日为止的应打卡总次数**（按目标、按次数算）
  - 例：2 个每天目标，今天只打 1 个 → 50%
- 累计坚持天数、最长连续天数
- 最近 7 天 / 年度趋势
- 每个目标的"完成次数 / 目标次数"

---

## 5. 后端接口一览

完整字段与请求示例见 [backend-api.md](backend-api.md)。

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| POST | `/v1/auth/register` | 注册（支持 nickname） |
| POST | `/v1/auth/login` | 登录 |
| GET | `/v1/users/me` | 当前用户 |
| GET | `/v1/goals?date=YYYY-MM-DD` | 目标列表 + 今日完成状态 + 连续天数 |
| POST | `/v1/goals` | 新建目标 |
| GET/PUT/DELETE | `/v1/goals/{id}` | 单个目标详情 / 修改 / 删除 |
| GET | `/v1/goals/{id}/week-progress` | 周进度 |
| POST | `/v1/checkins` | 打卡 |
| DELETE | `/v1/checkins/today` | 取消今日打卡 |
| GET | `/v1/checkins` | 打卡记录 |
| GET | `/v1/statistics?period=this_month/last_month/this_year` | 统计 |
| GET | `/v1/health` | 健康检查 |

---

## 6. 完整流程复盘

### 6.1 从"设计"到"前端"

1. 沟通产品定位：**个人自我管理打卡**，不是企业考勤
2. 先做高保真 HTML 原型，移动端一屏一页，方便截图评审
3. 每页严格一个页面，不擅自加需求（登录页只做账号密码，注册页只做账号密码）
4. 统一设计语言：绿色渐变、卡片圆角、字号克制
5. 原型确认后，用 uni-app + Vue3 实现真实页面
6. 页面之间路由：注册成功→登录页；登录成功→打卡主页；主页→统计 / 新建目标 / 修改目标

### 6.2 从"前端 Mock"到"真实后端"

1. 先写后端（Node 内置 HTTP + SQLite），接口一次定义清楚
2. 前端集中管理接口地址：`src/utils/api-config.js`
3. 删除本地 Mock，逐页接入真实接口
4. 本地前后端联调，验证注册→登录→设目标→打卡→统计全链路

### 6.3 从"本地"到"线上"

```text
本地 Git → GitHub 仓库
         → GitHub Actions 自动打包 Docker 镜像 → ghcr.io
                                              → Sealos 拉镜像部署
                                              → 得到公网 HTTPS 地址
```

关键配置：
- GitHub Actions 工作流：`.github/workflows/build-backend-image.yml`
- 镜像命名：`ghcr.io/hywwz/elo-backend:latest` + commit SHA 标签
- Sealos 应用名：`elo-backend`
- Sealos 网络：容器暴露端口 `3000`，公网 https
- Sealos 持久化：把存储挂载到 `/app/data`（否则重启丢数据）

后端健康检查：`GET https://cywspqlnlffd.cloud.sealos.io/v1/health`

### 6.4 微信小程序发布流程

```text
npm run build:mp-weixin
→ dist/build/mp-weixin
→ 微信开发者工具导入
→ 真机预览调试
→ 工具栏"上传"版本 1.0.0
→ 小程序后台：开发版本 → 选为体验版
→ 成员管理：添加体验成员（个人主体上限约 15 人）
→ 分享体验版二维码
```

### 6.5 Android App 打包流程

```text
npx uni build -p app
→ dist/build/app（uni-app 编译好的 App 资源）
→ HBuilderX 导入 dist/build/app
→ manifest.json：名称 / AppID / 描述
→ Build → App-Android/iOS - Cloud Packaging
→ Android 证书选"云端证书"（需先创建）
→ Channels None，模式 Safe Mode
→ Submit，2~5 分钟出 APK
```

当前 APK：`dist/build/app/unpackage/release/apk/H5680A95B__20260906032340.apk`

---

## 7. 知识笔记

### 7.1 uni-app 一套代码出多端

- 微信小程序：`npm run build:mp-weixin`
- H5：`npm run build:h5`
- App 资源：`npx uni build -p app`
- App 资源不能直接变安装包：真正的 APK/IPA 需要 HBuilderX 云打包
- uni-app SDK 版本要和 HBuilderX 版本匹配（本项目 SDK 5.24 ↔ HBuilderX 5.24）

### 7.2 GitHub + GHCR + Sealos 的无服务器部署

- 无需自己买服务器、无需本机装 Docker
- GitHub Actions 自动构建镜像并推到 GitHub Container Registry（ghcr.io）
- 把 ghcr.io 的镜像设为 **Public**，Sealos 才能免登录拉取
- Sealos 部署成功后会给一个公网 HTTPS 地址
- 数据持久化：SQLite 文件目录要挂载持久卷，否则容器重建会丢数据

### 7.3 微信小程序"合法域名"规则

- 开发者工具里勾选"不校验合法域名"**只对电脑模拟器有效**
- 手机真机/体验版默认仍然校验域名
- 手机端临时解决办法：小程序右上角"…" → 打开"开发调试"（每台手机一次）
- 正式给大众用：必须在小程序后台配置 request 合法域名（通常需要备案过的正式域名）
- 个人主体的体验成员数量有限制（本项目场景约 15 人）

### 7.4 Node 内置 SQLite

- `node:sqlite` 是 Node 22.5+ 的内置能力，**不需要安装第三方数据库**
- 适合小体量工具型产品，但生产发布需注意持久化与备份

### 7.5 HBuilderX 云打包要点

- 云打包是**插件**：装完 HBuilderX 后还需要安装"App云打包"插件
- 云打包前账号必须在 DCloud 开发者中心**验证手机号**
- 新版安卓打包**不允许用公共测试证书**，要用**云端证书**（开发者中心创建）
- 测试期 Channel 选 None 即可，不用发各应用市场

---

## 8. 踩坑记录（含解决方案）

### 8.1 时区导致"打卡了但主页没勾"

现象：打卡数据统计里有，主页却不显示 ✓；统计率甚至变成 200%。

原因：容器默认 UTC 时间，北京时间凌晨 0-8 点之间，"今天"差了一天——打卡被记到昨天，主页查的是今天。

解决：后端所有"今天/日期"统一用 `Asia/Shanghai` 计算：

```js
// server/time.js
new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai', ... })
```

感悟：**服务器时间 ≠ 用户时间**，涉及"今天/本周/本月"的业务必须显式固定时区。

### 8.2 主页残留原型假数据

现象："早上好，陈晨""已坚持 12 天"是写死的。

解决：
- 问候语按当前小时变化（早上好/上午好/中午好/下午好/晚上好）
- 昵称取自注册时填写的昵称（或账号前缀）
- 连续天数从后端打卡记录真实计算

感悟：原型阶段的"视觉示意文字"接真实数据时最容易被漏掉，联调时要逐字核对页面文案。

### 8.3 "打卡率"到底算什么

一开始按"天"算：同一天只要打任意一个目标就算完成，导致 2 个目标打 1 个也显示 100%。

与用户确认后改成**按次数**：

```text
打卡率 = 实际打卡次数 ÷ 到今日为止的应打卡总次数
```

例：2 个每天目标，今天打 1 个 = 50%。

感悟：**产品指标的定义必须先和用户对齐再动手**，不能按开发者直觉默认。

### 8.4 真机连不上后端

开发者工具正常，手机预览报"无法连接服务器"。

原因：真机受微信合法域名限制；工具里的"不校验"在真机不生效。

解决：手机打开小程序右上角"…"→ 打开"开发调试"；正式发布需配置正式域名。

### 8.5 DCloud 云打包连环权限

报错顺序：
1. 未安装 App云打包插件 → HBuilderX 插件安装
2. 账号未验证手机号 → DCloud 开发者中心验证
3. 公共测试证书不可用 → 开发者中心创建 Android 云端证书

之后打包即成功。

---

## 9. 常用命令速查

```bash
# 微信小程序：开发/打包
npm run dev:mp-weixin
npm run build:mp-weixin

# H5
npm run build:h5

# App 资源（之后用 HBuilderX 云打包）
npx uni build -p app

# 本地启动后端
cd server && npm start

# 健康检查
curl https://cywspqlnlffd.cloud.sealos.io/v1/health

# 提交并触发线上后端自动重新打包
git add .
git commit -m "fix: ..."
git push
```

> GitHub Actions 只在 `server/**` 或工作流文件变化时触发后端镜像重打包；
> 只改前端时，推送代码做版本备份即可，不用重部署后端。

---

## 10. 待办与未来方向

- [ ] 每日提醒目前只保存了"提醒时间"，系统级通知推送尚未接入
- [ ] App 正式图标 / 启动图细化（当前打包已可用）
- [ ] iOS 打包需要苹果开发者账号（年费），暂缓
- [ ] 若要正式发布：正式域名 + ICP 备案 + 微信合法域名配置
- [ ] 后端数据备份与清理机制
- [ ] 更多统计维度（按目标维度、年度日历打卡图等）

---

## 11. 项目感悟

1. **先确认"一个页面就是一个页面"**：小步交付，用户说不要多做就不多做。
2. **原型先于代码**：HTML 高保真原型让设计和交互在写代码前就达成一致。
3. **统一设计语言**：绿色渐变、留白、卡片、字号——看似小事，决定了产品质感。
4. **名词要定义清楚**：`打卡率`这种指标，用户和开发者理解可能完全不同。
5. **真实环境才能暴露真实问题**：本地模拟器没问题，不等于真机/服务器没问题（时区、域名校验）。
6. **把部署做成"自动化 + 一步步带"**：对不懂技术的用户，最有效的是把每一步拆到最小、讲人话。
7. **坚持每天一点点，数据会自己说话**——这也是 elo 打卡想传递的理念。
