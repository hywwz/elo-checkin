# elo 打卡 · 本地部署与给别人部署指南

> 面向“不想长期付服务器费用”“想让亲戚朋友也能用”的场景。
> 一句话结论：1~2 人自用，后端跑在自己电脑上就够了；远程给姐姐用，最省心的仍是免费/低成本的云实例，或直接把账号注册到你现有的服务里。

---

## 一、完全本地部署（自己用，不花钱）

### 1. 准备

- 一台能长期开机的电脑（笔记本/台式机/旧电脑都行）
- 安装 Node.js **22 或更高版本**（后端用到 Node 内置 SQLite，低版本跑不起来）
- 确认方式：命令行执行 `node -v`，看到 v22.x 即可

### 2. 启动后端

```bash
cd server
npm start
```

默认监听 `http://localhost:3000`。

验证：

```bash
curl http://localhost:3000/v1/health
```

返回 `{"code":0,...}` 就说明后端起来了。

### 3. 设置管理员（可选）

Windows PowerShell：

```powershell
$env:ADMIN_ACCOUNTS="你的账号"
npm start
```

Linux / macOS：

```bash
ADMIN_ACCOUNTS="你的账号" npm start
```

> 管理员账号必须和你注册进数据库的账号完全一致（不带空格）。

### 4. 前端怎么用

#### 方式 A：只用电脑浏览器（最省事）

修改 `src/utils/api-config.js`：

```js
export const API_BASE_URL = 'http://localhost:3000/v1'
```

然后：

```bash
npm install
npm run dev:h5        # 开发调试
npm run build:h5      # 正式产物在 dist/build/h5
```

#### 方式 B：手机 App 连家里电脑（同一 WiFi）

1. 电脑查局域网 IP：

```powershell
ipconfig
```

找到 IPv4，例如 `192.168.1.10`。

2. `src/utils/api-config.js` 改成：

```js
export const API_BASE_URL = 'http://192.168.1.10:3000/v1'
```

3. 电脑防火墙放行 3000 端口。
4. 重新打一次包/资源再装到手机。

> 注意：安卓正式包默认可能拦截“明文 http”地址。自用阶段建议用 H5 或调试基座验证；要稳定给手机用，最好还是有一个 https 地址（见第三节云方案）。

### 5. 数据备份（最重要）

数据存在 `server/data/elo.db`（WAL 模式，旁边会有 `-wal` / `-shm` 临时文件）。

备份（服务运行中也能安全备份）：

```bash
cd server
npm run backup
```

产物：`server/data/backups/elo-时间戳.db`

恢复：把备份文件改名回 `elo.db` 放回 `server/data/`，再启动即可。

详细说明见 [BACKUP-GUIDE.md](BACKUP-GUIDE.md)。

---

## 二、给别人部署前，先想清楚要哪种

### 情况 1：她只是“用一下”

**不需要部署新服务器。** 你现在的后端继续跑，让她在 App 里注册自己的账号即可，注册上限由你控制；你也不用额外花钱。

适合：姐姐、亲戚、朋友 1~20 人。

### 情况 2：她要独立/私有的数据，或不想用你的服务器

需要给她单独部署一套后端。推荐顺序：

1. 用**免费云额度**再开一个实例（Sealos / 其它免费层）；
2. 给她自己的实例设置 `ADMIN_ACCOUNTS=她的账号`；
3. 按 [DEPLOY-GUIDE.md](DEPLOY-GUIDE.md) 完成部署；
4. 给她打包一个指向该地址的 APK。

### 情况 3：完全不花钱且她离你很远

只有一条路：**你的电脑必须 7×24 开机**，并想办法把服务暴露到公网：

- 家里有公网 IP：路由器端口转发 + 动态域名；
- 没有公网 IP：Tailscale / 内网穿透（frp、cpolar 等），难度较高；
- 有 NAS/旧电脑：装 Tailscale 后把服务放到内网，给她也装 Tailscale 访问。

这种适合你懂网络配置的情况；给非技术的姐姐用，通常还是“免费云实例”更省心。

---

## 三、我帮姐姐远程部署，具体怎么做

前提：部署需要能登录她（或你新开）的云平台账号。你本人无法凭空远程操作她的电脑/平台，必须拿到以下任一种：

- 她注册好 Sealos 账号后，把**登录授权给你**（网页上临时登录）；
- 或者你自己新开一个免费账号部署好，把公网地址和 App 给她；
- 或者她愿意用你现有的后端，只注册账号。

拿到账号后的操作：

```text
1. GitHub 建她自己的仓库（或 fork 本项目）
2. GitHub Actions 自动构建后端镜像（需仓库 Actions 开启、镜像公开）
3. Sealos 新建应用 elo-backend：
   - 镜像：ghcr.io/<她的用户名>/elo-backend:latest
   - 端口：3000
   - 环境变量：ADMIN_ACCOUNTS=<她自己的管理员账号>
   - 持久化：挂载 /app/data（数据不能丢）
4. 得到 https 地址，健康检查通过
5. 改 src/utils/api-config.js 指向该地址，再打包 APK 给她
```

详细步骤见 [DEPLOY-GUIDE.md](DEPLOY-GUIDE.md)；给使用者的安装文字见 [INSTALL-GUIDE.md](INSTALL-GUIDE.md)。

---

## 四、常见问题

| 问题 | 回答 |
| --- | --- |
| 本地部署数据会丢吗 | 不会，只要 `server/data/elo.db` 在；建议定期备份 |
| 手机连不上电脑 | 检查同一 WiFi、电脑防火墙、端口 3000、地址是否写对 |
| 只能一个人注册吗 | 不限制，谁都可以注册；管理员可重置密码/删用户 |
| Sealos 免费额度够吗 | 本项目后端很小，普通个人使用免费额度足够；别为了省钱频繁换账号，备份反而麻烦 |
| 别人看到开源项目怎么部署 | 看 `DEPLOY-GUIDE.md`（线上免费云）和本文件（本地自用），README 也放了入口 |

---

当前版本：v1.0.4（2026-09-08）
