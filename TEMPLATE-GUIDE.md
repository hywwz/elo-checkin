# elo 打卡 · 模板框架提炼（小白版）

> 本文件把 elo 打卡项目的代码结构"拆开讲清楚"：每一层是干什么的、文件之间怎么连接、做新功能时要改哪里。看完你能拿着这套结构去做自己的 App / 小程序。（当前项目主端为 Android App，微信小程序已停更。）

---

## 1. 一句话认识这套模板

**uni-app（前端）→ 一个 Node.js 服务（后端）→ 一个 SQLite 文件（数据库）**

```text
手机/浏览器里的页面（uni-app + Vue3）
        │ 发 HTTP 请求（JSON）
        ▼
Node.js 后端（纯内置模块，零第三方依赖）
        │ 读写 SQL
        ▼
SQLite 数据库文件（server/data/elo.db）
```

所有代码就在 2 个文件夹里：

- `src/` = 前端（页面 + 请求封装 + 配置）
- `server/` = 后端（入口 + 业务模块 + 建表）

---

## 2. 前端框架：文件怎么分工

### 2.1 三个入口文件（src 根目录）

| 文件 | 作用 | 什么时候用 |
| --- | --- | --- |
| `src/main.js` | 前端程序入口，启动 Vue | 一般不用改 |
| `src/App.vue` | 全局生命周期（启动/切后台），可放全局样式 | 想"每次打开 App 都做点事"时改这里 |
| `src/pages.json` | 页面清单：**每加一个页面都要在这里登记** | 新建页面后必改 |

> 最容易踩的坑：新建了 `pages/xxx/xxx.vue` 却没在 `pages.json` 里登记 → 跳转时提示页面不存在。

### 2.2 页面（src/pages）

每个功能一个文件夹，一个页面通常分三块（`<template>` 界面 / `<script>` 逻辑 / `<style>` 样式）：

```text
src/pages/login/login.vue            登录
src/pages/register/register.vue      注册
src/pages/checkin/checkin.vue        登录后的主页
src/pages/set-goal/set-goal.vue      新建目标
src/pages/edit-goal/edit-goal.vue    修改目标
src/pages/statistics/statistics.vue  统计
src/pages/account-security/account-security.vue  账号与安全 / 修改密码 / 系统提醒开关
src/pages/notify-test/notify-test.vue            本地通知真机测试（开发入口）
```

页面常用写法（每个页面几乎都长这样）：

```js
export default {
  data() {
    return { name: '', loading: false }
  },
  onLoad() {
    // 进入页面时执行一次（放“读取参数、初始化”）
  },
  onShow() {
    // 每次页面显示都执行（放“刷新数据”，返回本页也能刷新）
  },
  methods: {
    async fetchData() {
      // 调接口
    }
  }
}
```

页面跳转用 `uni.` 自带 API（一套代码各端通用）：

```js
uni.navigateTo({ url: '/pages/set-goal/set-goal' })   // 进新页面，带返回键
uni.reLaunch({ url: '/pages/checkin/checkin' })       // 关闭其他页面直接开新页（登录/退出用）
uni.showModal({ title: '提示', content: '确定吗？' })  // 弹窗
uni.showToast({ title: '保存成功', icon: 'success' })  // 轻提示
```

### 2.3 请求层（src/utils）—— 前端的"邮局"

所有页面不许自己写 `uni.request`，统一走这两个文件：

| 文件 | 作用 |
| --- | --- |
| `api-config.js` | 只存一行：后端地址 `API_BASE_URL`（改服务器地址只改这里） |
| `request.js` | 封装请求：自动带登录 token、统一处理错误、401 自动踢回登录页 |

页面里这样用：

```js
import { get, post, put, del } from '../../utils/request.js'

const data = await get('/goals?date=2026-09-06')   // GET
await post('/goals', { name: '学习' })              // POST（传 JSON）
await del('/checkins/today', { goalId: 'goal_1' })  // DELETE
```

约定：凡是调登录后的接口，**都从这里走**，不要自己开一条 `uni.request`。唯一的例外是 `src/utils/app-update.js`（更新接口无需登录，单独请求）。

### 2.4 App 版本更新（src/utils/app-update.js）

专门做"发现新版本"的模块：登录页启动自动检查 + 账号页手动检查。

- `APP_VERSION` = 当前安装版本号（发新版时和 `manifest.json`、`server/app-update.js` 三处一起改）；
- `checkForAppUpdate()` = 自动检查（每会话一次，失败静默）；
- `forceCheckForAppUpdate()` = 手动检查（"检查更新"按钮用）。

### 2.5 系统提醒调度（src/utils/reminder-scheduler.js + uni_modules/elo-notify）

`src/utils/reminder-scheduler.js`：把后端目标列表转成“未来 30 天的本地闹钟”，每次打卡页刷新/打卡后重新排布；风险与成就提醒开关存本地。

`src/uni_modules/elo-notify/`：自研 UTS 原生插件，负责 Android 通知权限、立即通知、指定时间通知与取消。

```js
// APP-PLUS 下导入示例
import { syncAllReminders, showMilestoneNotification } from '../../utils/reminder-scheduler.js'
```

说明：提醒只调度在设备本地，后端不保存提醒任务；小米/红米需开启「自启动 + 省电策略无限制」，否则系统会冻结闹钟。

---

## 3. 后端框架：文件怎么分工

### 3.1 一眼看懂后端结构

```text
server/
├── index.js          入口：建 HTTP 服务 + 路由（相当于“总台接线员”）
├── db.js             建数据库文件 + 建表（表结构都在这）
├── auth.js           注册/登录/改密码/会话 token（密码相关都在这里）
├── goals.js          打卡目标增删改查
├── checkins.js       打卡/取消打卡
├── statistics.js     统计计算
├── admin.js          管理员接口（看用户记录/重置密码/删用户）
├── time.js           统一"今天/日期"计算（按北京时间）
└── app-update.js     App 更新信息（版本号、下载地址）
```

### 3.2 请求怎么走到业务代码（重点理解）

```text
手机发来:  POST /v1/goals  带 Bearer token
            │
index.js 的 route() 收到
    │ 1. 先做公共事：解析地址、验 token（找不到就 401）
    │ 2. 按地址匹配业务模块: /goals → goals.js
    │ 3. 业务模块读写数据库，把结果 JSON 返回
```

想加一个新接口，永远三步：

1. 在某个模块写一个处理函数（比如 `handleXxx(req, res, user)`）；
2. 在 `index.js` 的路由里加一行匹配（`if (path === '/v1/xxx' && method === 'GET')`）；
3. 在接口文档里登记一行。

### 3.3 数据存哪、长什么样（db.js）

SQLite = 一个文件数据库，不用安装任何数据库软件。表结构就在 `server/db.js` 的 `CREATE TABLE` 里。

本项目 4 张表：

| 表 | 存什么 | 关键字段 |
| --- | --- | --- |
| `users` | 用户 | account（唯一）、nickname、password_hash |
| `sessions` | 登录会话 | token、user_id、expires_at（30 天过期） |
| `goals` | 打卡目标 | user_id、name、task、freq_mode/count/days、reminder_time |
| `checkins` | 打卡记录 | user_id、goal_id、date（同一天同一目标唯一） |

数据文件位置：`server/data/elo.db`（已被 .gitignore 排除，不会上传到 GitHub）。

### 3.4 密码和登录是怎么做的（安全要点）

这套模板的安全做法可以直接复制到新项目：

1. **注册**：`hashPassword()` 用 Node 内置 `crypto.scryptSync` 加盐哈希，格式 `盐:哈希`，**不存明文密码**；
2. **登录**：`verifyPassword()` 比对哈希，成功生成一个随机 token 存进 `sessions` 表，把 token 返回给前端；
3. **每次请求**：前端带 `Authorization: Bearer <token>`，后端 `findUserByToken()` 查到用户才算登录；
4. **改密码**：验证旧密码 → 生成新哈希 → 删掉该用户所有会话 → 强制重新登录；
5. **退出**：`revokeSession()` 删掉 token，让它立刻失效。

> 没有用 JWT，用的"随机 token 存数据库"，好处是退出/改密码可以立刻让旧 token 失效，适合小项目。

---

## 4. 加一个新功能要改哪几个文件（实操路径）

以"给用户加一个备注字段"为例：

```text
① server/db.js        → users 表加一列 note（或直接查现有列）
② server/auth.js      → 注册/返回用户时带上 note
③ src/pages/register/register.vue → 表单加“备注”输入框
④ src/pages/...       → 需要展示的地方显示 note
⑤ backend-api.md      → 接口字段文档同步加一行
⑥ 本地跑一遍 → git 提交 → push
```

套路总结：**后端表 → 后端接口 → 前端页面 → 文档 → 提交**，顺序别乱，少了哪步都会对不上。

---

## 5. 常用的 5 个开发命令

```bash
npm install                 # 第一次拉完代码先装依赖

npm run dev:h5              # 本地 H5 调试
npm run build:h5            # 编译 H5，快速检查页面/JS 语法

# App 真机/云打包（HBuilderX CLI，源码工程根目录）
B:/Networking/HBuilderX/cli.exe publish app --type appResource --project <项目根>
B:/Networking/HBuilderX/cli.exe pack --config .pack-release.json

cd server && npm start      # 本地启动后端 → http://localhost:3000
```

本地联调小抄：后端起在 3000 端口，`src/utils/api-config.js` 改成 `http://localhost:3000/v1`，H5 调试完记得改回线上地址 `https://cywspqlnlffd.cloud.sealos.io/v1`。

---

## 6. 迁移到"你自己的项目"清单

想拿这套模板开新项目，按顺序做这些替换：

1. `src/manifest.json`：改应用名、**AppID（DCloud 后台创建）**、版本号；
2. `src/utils/api-config.js`：改你自己的后端地址；
3. `src/static/`：换自己的 App 图标（1024 源图 + 5 个分辨率，manifest 里配好）；
4. `server/index.js`：把 `/goals` `/checkins` 等路由替换成你的业务；
5. `server/db.js`：把表结构换成你的数据模型；
6. `server/app-update.js` + `src/utils/app-update.js` + `src/manifest.json`：三处版本号 + 下载地址同步换；
7. 不需要系统提醒就删掉 `src/utils/reminder-scheduler.js` 与 `src/uni_modules/elo-notify/`，并把页面里的引用清掉；
8. `.github/workflows/build-backend-image.yml`：把镜像名 `elo-backend` 换成你的项目名；
9. README.md / PROJECT.md / backend-api.md / INSTALL-GUIDE.md：改成你的说明。

> 提醒：模板里的数据库、路由、页面都是 elo 打卡的业务代码。最省力的迁移方式是**保留 `src/utils/`、`server/auth.js`、`server/index.js` 的路由骨架、`.github` 部署工作流**，业务表换成你自己的。

---

## 7. 看完自查表

能回答下面 5 题，说明你基本入门了：

1. 新加页面后忘了改哪个文件会跳转失败？ → `src/pages.json`
2. 后端地址在哪个文件改？ → `src/utils/api-config.js`
3. 想给接口加权限检查，改哪个文件？ → `server/index.js`（route 里统一验 token）
4. 密码存在数据库里是什么形式？ → 加盐哈希 `盐:哈希`，不是明文
5. 数据库文件在哪个路径、要不要提交 git？ → `server/data/elo.db`，不要（.gitignore 已排除）

完整的部署过程见 [DEPLOY-GUIDE.md](DEPLOY-GUIDE.md)。
