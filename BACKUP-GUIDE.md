# elo 打卡 · 数据库备份指南

重要数据都在 `server/data/elo.db`（本地开发）和 Sealos 持久卷 `/app/data`（线上）。
发布、清理脏数据或做危险操作前，先备份一次。

## 本地备份

```bash
cd server
npm run backup
```

产物：`server/data/backups/elo-时间戳.db`（git 已忽略，不会误提交）。

## Sealos 线上备份

1. 打开 Sealos 桌面 → 应用管理 → `elo-backend` → 进入容器终端（Web 终端）；
2. 执行：

```bash
cd /app
node backup-db.js
```

3. 用 Sealos 的文件管理把 `/app/data/backups/elo-时间戳.db` 下载到本地保存。

> 提示：备份是整库快照，下载回来后可以直接用 Node 22+ 的 `node:sqlite` 打开查询，
> 也可以替换本地 `server/data/elo.db` 用于离线排查。
