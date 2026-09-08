// 数据库一致性备份脚本
// 本地：在 server 目录执行 npm run backup
// Sealos 线上：进入容器终端，在 /app 目录执行 node backup-db.js
// 产物：data/backups/elo-时间戳.db（可用 Sealos 文件管理下载到本地）
import { mkdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { DatabaseSync } from 'node:sqlite'

const here = path.dirname(fileURLToPath(import.meta.url))
const dataDir = path.join(here, 'data')
const backupDir = path.join(dataDir, 'backups')
mkdirSync(backupDir, { recursive: true })

const stamp = new Date()
  .toISOString()
  .replace(/[:.]/g, '-')
  .slice(0, 19)
const dest = path.join(backupDir, `elo-${stamp}.db`)

const db = new DatabaseSync(path.join(dataDir, 'elo.db'))
// VACUUM INTO 会生成一份一致性快照，即使 WAL 里还有未落盘数据也安全
db.exec(`VACUUM INTO '${dest.replace(/'/g, "''")}'`)
db.close()

console.log(`备份完成：${dest}`)
