# elo 打卡 · 从零到上线全流程（小白版）

> 假设你完全不懂部署。本文件把"代码写好之后怎么让用户用上"拆成一步一步，每步告诉你：做什么、为什么、报错怎么办。

---

## 0. 先建立整体地图

这个项目有 4 个"家"，别搞混：

```text
┌─────────────┐   你的电脑（本地）        ── 写代码、调试
├─────────────┤   GitHub（代码仓库）     ── 存代码 + 自动构建后端镜像
├─────────────┤   ghcr.io（镜像仓库）    ── 存放"后端容器镜像"
├─────────────┤   Sealos（云服务器）     ── 真正跑后端的地方（给全世界提供接口）
└─────────────┘   微信/手机              ── 用户使用的终端
```

一条主线：

```text
你在电脑写好前端+后端
    │
    ├── 后端代码 → push 到 GitHub → GitHub 自动打包成镜像 → ghcr.io
    │                                                   → Sealos 拉取运行
    │
    ├── 前端(小程序) → 编译 → 微信开发者工具 → 上传 → 微信平台 → 用户打开小程序
    │
    └── 前端(App) → 编译 → HBuilderX 云打包 → APK → 用户安装（或走应用内更新）
```

---

## 1. 你需要先装好的 5 样东西

| 工具 | 干什么的 | 官网关键词 |
| --- | --- | --- |
| Node.js（22 以上） | 跑后端、跑编译命令 | nodejs.org |
| HBuilderX | uni-app 官方编辑器，做 App 云打包 | dcloud.io/hbuilderx |
| 微信开发者工具 | 调试/上传小程序 | 微信公众平台 → 开发者工具 |
| Git | 把代码推送到 GitHub | git-scm.com |
| Sealos 账号 | 部署后端的云平台 | sealos.io |

> 验证安装：在命令行输入 `node -v` 能显示版本号（如 v22.x）就算装好。

---

## 2. 先把代码跑起来（本地开发）

### 2.1 安装前端依赖

在项目根目录打开命令行：

```bash
npm install
```

### 2.2 启动后端（本地）

```bash
cd server
npm start
```

看到 `elo backend running at http://localhost:3000` 就是成功了。验证：浏览器打开

```text
http://localhost:3000/v1/health
```

应返回 `{"code":0,"message":"ok",...}`。

### 2.3 本地跑小程序 / App 资源

```bash
# 回到项目根目录
npm run dev:mp-weixin   # 实时编译小程序（微信开发者工具导入 dist/dev/mp-weixin）
npx uni build -p app    # 编译 App 资源（HBuilderX 导入 dist/build/app）
```

> 前后端联调时，把 `src/utils/api-config.js` 里的地址临时改成 `http://localhost:3000/v1`；调试完记得改回线上地址 `https://cywspqlnlffd.cloud.sealos.io/v1`。

---

## 3. GitHub：代码的"永久存档 + 自动工厂"

### 3.1 为什么要 GitHub

GitHub 干两件事：

1. **备份**：你电脑坏了，代码还在云端；
2. **自动构建**：后端代码一 push，GitHub Actions 自动把后端打成容器镜像推到 ghcr.io，不用你自己装 Docker。

### 3.2 把本地代码推上去

```bash
git init
git add .
git commit -m "init"
git remote add origin https://github.com/你的用户名/你的仓库名.git
git push -u origin master
```

> 注意：`server/data/`、`dist/`、`node_modules/` 已被 `.gitignore` 排除，**不会上传数据库文件和编译产物**，这是对的。

### 3.3 GitHub Actions 在跑什么（.github/workflows/build-backend-image.yml）

这个文件是一张"自动化任务单"，翻译成人话：

```text
什么时候触发：master 分支有 push，且改动在 server/ 目录
做什么：
  1. 把代码下载到临时电脑
  2. 用 server/Dockerfile 把后端打包成镜像
  3. 推送到 ghcr.io/hywwz/elo-backend（latest + 本次提交编号两个标签）
```

查看构建是否成功：GitHub 仓库 → **Actions** 标签 → 看最新一条是绿色（成功）还是红色（失败）；失败点进去看日志。

> 常见失败：只改了前端（没改 server/）→ 不会触发，属正常；推送后等 1~3 分钟再去 Actions 看。

---

## 4. Sealos：让后端 7×24 小时在线

### 4.1 什么是 Sealos

一个云平台：帮你在云端运行 Docker 容器，给一个**公网 HTTPS 地址**，手机上的 App/小程序都能访问。免去自己买服务器、装环境。

### 4.2 首次部署步骤（一次性的）

1. 打开 https://cloud.sealos.io 登录（可用 GitHub 账号）；
2. 创建应用（App）：
   - 名字：`elo-backend`；
   - 镜像：`ghcr.io/hywwz/elo-backend:latest`（必须是公开镜像才能拉取）；
   - 端口：容器内 `3000`；
   - 环境变量：`ADMIN_ACCOUNTS=你自己定的管理员账号`（如 `elo-admin`，多个用逗号；**不要用测试1/公开过的账号**）；
3. **持久化（最重要的一步）**：把存储挂载到 `/app/data`。否则容器一重建，数据库文件就丢了，用户数据全没；
4. 部署完成后平台给你一个 https 地址，形如 `https://xxxx.cloud.sealos.io`。

验证：浏览器打开 `https://你的地址/v1/health` 有返回即成功。

### 4.3 日常更新后端（以后最常做的一步）

```text
我改了后端 → 提交并 push → GitHub Actions 自动构建（去 Actions 等绿勾）
→ 打开 Sealos → 找到 elo-backend → 点“变更/更新”或重新部署 → 保存
→ 完成，用户无需做任何事
```

> Sealos 有时不会自动拉最新镜像，需要你手动触发一次"重新部署/拉取镜像"。

> 如果不想用云服务器、只想自己电脑跑：看 [LOCAL-DEPLOY.md](LOCAL-DEPLOY.md)。

---

## 5. 微信小程序上线（⏸ 已停更，仅供历史参考）

前提：微信公众平台注册了小程序（个人主体即可），拿到 AppID。

### 5.1 小程序里配好后端地址

`src/utils/api-config.js` 必须指向公网地址 `https://你的sealos地址/v1`。小程序后台 → 开发管理 → 开发设置 → **服务器域名** 里把该域名加入 `request 合法域名`（必须是备案过的域名或平台认可域名；个人开发者临时体验可用"开发调试"绕过）。

### 5.2 编译并导入

```bash
npm run build:mp-weixin
```

微信开发者工具 → 导入项目 → 目录选 `dist/build/mp-weixin` → 填入你的小程序 AppID。

### 5.3 真机预览 / 上传体验版

- 预览：工具里点"预览"，手机扫码；
- 上传：点"上传"，填版本号 → 微信公众平台 → 版本管理 → 把这个开发版"选为体验版" → 添加体验成员（个人主体约 15 人上限）。

> 常见坑：手机真机请求失败但电脑正常 = 合法域名没配或没开"开发调试"。

---

## 6. Android App 打包与分发（当前主链路）

### 6.1 流程概览

```text
用 HBuilderX 直接打开源码工程根目录（本仓库根目录，含 src/ 与 static Junction）
→ 编译/导出 App 资源：HBuilderX CLI publish app --type appResource
→ 云打包：HBuilderX CLI pack --config .pack-release.json
→ 下载 APK 保存到 dist/release/
```

### 6.2 HBuilderX 首次准备（一次性的）

1. 安装 HBuilderX → 工具 → 插件安装 → 安装"App 云打包"插件；
2. 注册 DCloud 开发者账号，并**验证手机号**；
3. 打开 https://dev.dcloud.net.cn → 创建 **Android 云端证书**（新版不允许公共测试证书）。

### 6.3 云打包步骤

1. HBuilderX 打开源码工程根目录（不是 dist/build/app）；
2. 打开 `manifest.json`（可视化界面）核对：应用名、**AppID（需在 DCloud 后台创建）**、版本号、图标；
3. 菜单 → 发行 → 原生 App-云打包；
4. 平台选 Android，证书选你的云端证书 → 打包 → 下载 APK。

> 常见报错：
> - "打包机已满" → DCloud 免费名额当天用完，第二天再试或付费；
> - "未验证手机号/证书不可用" → 回到 6.2 检查；
> - 装到手机提示"未知来源" → 手机设置里允许安装未知应用（只对你自己测试包需要）。

### 6.4 让老用户能自动升级（本项目的更新机制）

```text
① 云打包出新 APK
② 把 APK 传到 GitHub Releases（或任意可下载的地址）
③ 修改三处版本并推送：
   - src/manifest.json 的 versionName / versionCode
   - src/utils/app-update.js 的 APP_VERSION
   - server/app-update.js 的 latestVersion + downloadUrl
④ push 后等 GitHub Actions 绿勾，再到 Sealos 对 elo-backend 执行“更新/保存”
⑤ 老用户打开 App → 自动弹“发现新版本” → 点击下载安装
```

> Android 系统限制：不能静默自动安装，最后一步用户要点"安装"确认，这是平台规则，无解。

给使用者的安装引导：见 [INSTALL-GUIDE.md](INSTALL-GUIDE.md)

---

## 7. 发新版的标准动作清单（每次照抄）

| 动作 | 工具 | 备注 |
| --- | --- | --- |
| 改代码、编译验证 | 电脑命令行 | 当前以 App 为主：H5 用 `npm run build:h5`；App 资源用 HBuilderX `publish app --type appResource` |
| 提交推送 | git | 一条 commit 一个主题 |
| 后端生效 | Sealos | 等 GitHub Actions 绿勾后点"更新/重新部署" |
| 小程序 | ⏸ 已停更 | 微信小程序不再继续开发，只保留体验版 v1.0.1 |
| App 新版本 | HBuilderX | 云打包 → 传 GitHub Releases → 改版本号三处 → Sealos 更新 |

---

## 8. 这张图背后的钱和账号

| 服务 | 费用 | 需要准备 |
| --- | --- | --- |
| GitHub | 免费（公开仓库） | GitHub 账号 |
| ghcr.io 镜像仓库 | 免费 | 与 GitHub 同账号 |
| Sealos | 免费额度起步，按量付费可选 | Sealos 账号 |
| HBuilderX 云打包 | 每天有免费次数；付费可选 | DCloud 账号 + 验证手机号 + 云端证书 |
| 微信小程序 | ⏸ 已停更 | 只保留历史体验版 |
| Android 证书 | DCloud 免费创建 | DCloud 账号 |

> 唯一可能花钱的日常项是云打包次数，所以**建议攒一批改动再打包**，别改一个标点打一次。

---

## 9. 出问题时的排查顺序

```text
现象：小程序/App 请求失败
  ├─ 本地先跑后端 → health 通不通？不通 = 后端代码/启动问题
  ├─ 线上地址浏览器直接打开 → 通不通？不通 = Sealos 是否在跑/是否最新镜像
  ├─ 线上通、手机不通 = 域名白名单 / 真机“开发调试”
  └─ 后端 500 报错 → 看 Sealos 日志（部署页面有日志入口）

现象：云打包失败/排队
  → 按报错回查 6.2 / 6.3；免费名额满就明天或付费

现象：GitHub Actions 红叉
  → 点进 workflow 看日志，通常改一行语法就能修
```

---

## 10. 收藏夹（以后最常用的页面）

| 用途 | 地址 |
| --- | --- |
| 代码仓库 | https://github.com/hywwz/elo-checkin |
| 后端运行状态 | https://cywspqlnlffd.cloud.sealos.io/v1/health |
| 自动构建日志 | GitHub 仓库 → Actions |
| 云打包 | HBuilderX（插件） |
| DCloud 后台（证书/打包次数） | https://dev.dcloud.net.cn |
| 微信小程序后台 | https://mp.weixin.qq.com |

项目结构速查见 [TEMPLATE-GUIDE.md](TEMPLATE-GUIDE.md)，完整开发笔记见 [PROJECT.md](PROJECT.md)。
