# elo 打卡 · 文件导航

> 每个文件是干什么的，按这个清单翻最快。完整项目笔记见 [PROJECT.md](PROJECT.md)。

## 一、文档（先看这几份）

| 文件 | 作用 |
| --- | --- |
| README.md | 项目简介、功能、版本记录、文档入口 |
| PROJECT.md | 完整项目笔记：发布摘要、踩坑记录、打包流程、标签对照 |
| ROADMAP.md | 状态速查 + 决定记录 + 下一版动作（本系列） |
| FILEMAP.md | 本文件：逐文件说明 |
| INSTALL-GUIDE.md | 给使用者的安装说明（小米权限/勿扰/常见问题） |
| DEPLOY-GUIDE.md | 从零到线上部署（云平台） |
| LOCAL-DEPLOY.md | 本地自用 / 给别人部署 |
| BACKUP-GUIDE.md | 数据库备份步骤 |
| TEMPLATE-GUIDE.md | 代码结构拆解与改功能指南 |
| backend-api.md | 后端接口文档 |

## 二、后端（server/）

| 文件 | 作用 |
| --- | --- |
| index.js | HTTP 路由总入口，负责所有 `/v1/*` 接口分发 |
| auth.js | 注册/登录、密码哈希、会话、管理员名单（读 `ADMIN_ACCOUNTS`） |
| admin.js | 管理员操作：用户列表/记录/重置密码/强制下线/删除 |
| db.js | SQLite 初始化与建表（users / sessions / goals / checkins） |
| goals.js | 目标的增删改查 |
| checkins.js | 打卡与取消打卡、周进度 |
| statistics.js | 统计接口 |
| time.js | 北京时间日期工具 |
| app-update.js | 线上最新版本、APK 下载地址、更新说明 |
| backup-db.js | 数据库一键一致性备份 |
| Dockerfile / package.json | 容器镜像与启动命令 |

## 三、App 前端（src/）

### 入口与配置

| 文件 | 作用 |
| --- | --- |
| main.js | uni-app 启动入口 |
| App.vue | 全局生命周期与全局样式 |
| pages.json | 页面注册（决定启动页/登录后跳转） |
| manifest.json | AppID、版本号、打包图标、权限、包名相关 |
| uni.scss | 全局 SCSS 变量 |
| shime-uni.d.ts | uni-app 类型声明 |

### 页面（pages/）

| 文件 | 作用 |
| --- | --- |
| login/register | 登录、注册 |
| checkin/checkin.vue | 打卡主页：今日目标、打卡、连续天数；**进入时自动重排 30 天提醒** |
| set-goal/ | 新建打卡目标 |
| edit-goal/ | 修改目标 |
| manage-goals/ | 全部目标管理：修改 / 删除 / 新增 |
| statistics/ | 统计：本月/上月/今年、趋势 |
| account-security/ | 账号与安全：改密码、系统提醒开关、**立即重排提醒**、检查更新、提醒测试入口 |
| notify-test/ | 本地通知真机测试（开发用） |
| admin-users/ | 管理员：用户列表 |
| admin-user/ | 管理员：单个用户详情与操作 |

### 公共工具（utils/）

| 文件 | 作用 |
| --- | --- |
| request.js | HTTP 请求封装（token、错误提示） |
| api-config.js | 后端接口地址（当前指向 Sealos） |
| app-update.js | 本机版本常量 + 更新检查逻辑 |
| reminder-scheduler.js | 提醒核心：30 天排布、风险/成就提醒、开关 |
| goal-delete.js | 删除目标的温柔确认文案 |

### 通知插件（uni_modules/elo-notify/）

| 文件 | 作用 |
| --- | --- |
| utssdk/interface.uts | 插件对外接口声明 |
| utssdk/app-android/index.uts | Android 实现：立即通知、定时、取消、权限检查 |
| utssdk/app-android/AlarmReceiver.uts | 到点弹通知的广播接收器（含新通知渠道） |
| utssdk/app-android/AndroidManifest.xml | Android 权限与接收器声明 |
| utssdk/app-ios/ | iOS 占位实现 |
| readme.md / changelog.md / package.json | 插件说明与清单 |

### 图标与静态资源（src/static/）

| 文件 | 作用 |
| --- | --- |
| app-icon-final.png | 正式图标源图（1024×1024，README 展示用） |
| app-icon-48/72/96/144/192.png | Android 各分辨率打包图标（manifest 引用） |

## 四、根目录工具与配置

| 文件/目录 | 作用 |
| --- | --- |
| package.json | 前端脚本：dev/build、`release:bump` 版本号同步 |
| scripts/bump-version.mjs | 一键同步三处版本号 |
| vite.config.js / index.html | uni-app/Vite 构建配置 |
| .github/workflows/build-backend-image.yml | push 后自动构建后端镜像 |
| .pack-release.json / .pack-custom.json | HBuilderX 云打包配置（正式包/自定义基座） |
| archive/ | 历史原型与设计过程稿（可随时在 git 历史找回） |
| dist/ | 本地保存的 APK 产物（git 忽略） |
