#!/usr/bin/env node
// 用法：npm run release:bump -- 1.0.5
// 一键把三处版本号同步到新版本，避免发版时漏改：
//   src/manifest.json（versionName / versionCode）
//   src/utils/app-update.js（APP_VERSION）
//   server/app-update.js（latestVersion / downloadUrl）
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const next = process.argv[2]

if (!/^\d+\.\d+\.\d+$/.test(next || '')) {
  console.error('用法：npm run release:bump -- 1.0.5')
  process.exit(1)
}

const [major, minor, patch] = next.split('.').map(Number)
if (major > 9 || minor > 9 || patch > 9) {
  console.error('本项目 versionCode 约定为三位数字（如 1.0.4 -> 104），请保持每段 0-9。')
  process.exit(1)
}
const versionCode = String(major * 100 + minor * 10 + patch)

function read(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8')
}
function write(rel, content) {
  fs.writeFileSync(path.join(root, rel), content)
}

// 1. manifest.json（带注释的 JSON，用文本替换）
const manifestPath = 'src/manifest.json'
let manifest = read(manifestPath)
manifest = manifest.replace(/("versionName"\s*:\s*")[^"]*(")/, `$1${next}$2`)
manifest = manifest.replace(/("versionCode"\s*:\s*")[^"]*(")/, `$1${versionCode}$2`)
write(manifestPath, manifest)

// 2. 前端安装版本常量
const clientPath = 'src/utils/app-update.js'
let client = read(clientPath)
client = client.replace(/export const APP_VERSION = '[^']*'/, `export const APP_VERSION = '${next}'`)
write(clientPath, client)

// 3. 后端更新信息（latestVersion + 下载地址）
const serverPath = 'server/app-update.js'
let server = read(serverPath)
server = server.replace(/(latestVersion:\s*')[^']*(')/, `$1${next}$2`)
server = server.replace(
  /(downloadUrl:\s*')[^']*(')/,
  `$1https://github.com/hywwz/elo-checkin/releases/download/v${next}/elo-checkin-v${next}.apk$2`
)
write(serverPath, server)

console.log(`已同步到 v${next}（versionCode ${versionCode}）：`)
console.log('  - src/manifest.json')
console.log('  - src/utils/app-update.js')
console.log('  - server/app-update.js')
console.log('记得顺手：')
console.log('  1. 如有需要，更新 server/app-update.js 的 releaseNotes 文案')
console.log('  2. 提交并推送后，按发布流程云打包 APK')
