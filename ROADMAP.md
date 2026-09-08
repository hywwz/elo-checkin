# elo 打卡 · 状态速查与决定

> 这是一个“速查卡”：想知道现在到哪一步、为什么某件事没做，先看这里。
> 完整过程复盘看 [PROJECT.md](PROJECT.md)，代码文件导览看 [FILEMAP.md](FILEMAP.md)。

## 当前状态（2026-09-08）

| 项目 | 状态 |
| --- | --- |
| 对外 App 版本 | v1.0.4（GitHub Release 已发布） |
| 线上后端 | Sealos `elo-backend`，更新接口返回 v1.0.4 |
| 代码分支 | master 与 feat/delete-goal-management 同步 |
| App 内更新 | 用户打开 App 自动检测；线上版本高于本机版本时才提示 |

## 代码已备、还没发版（v1.0.5 候选）

- 管理员安全加固：不再内置“测试1”默认管理员，`ADMIN_ACCOUNTS` 环境变量未配置时无管理员
- “系统提醒”页新增“立即重排提醒”按钮：重启或漏排后一键恢复未来 30 天提醒
- 数据库备份脚本与指南：`server/backup-db.js` + `BACKUP-GUIDE.md`
- 发版版本号脚本：`npm run release:bump -- 1.0.5`

## 明确做过的决定

- **不做“开机自动恢复闹钟”（BOOT_COMPLETED）**：手机重启后打开一次 App，或点“立即重排提醒”即可恢复；对“每天会打开 App”的使用方式足够，不值得为少数场景加原生复杂度。
- **勿扰模式压横幅是系统行为，不是 App 问题**：小米勿扰/专注开启时横幅被系统禁止，只有声音和通知栏；用户需关闭勿扰或调整通知设置。
- **管理员身份只认环境变量**：不把默认测试账号写进代码，避免公开密码成为后门。
- **用户升级靠 App 内自动更新**：发布新版本 = 升版本号 + 云打包 + GitHub Release + Sealos 更新；不做静默安装。

## 下一版发布动作清单

1. `npm run release:bump -- 1.0.5`
2. HBuilderX 云打包 v1.0.5 APK，保存到 `dist/release/`
3. 上传 GitHub Release v1.0.5
4. 推送 master（触发后端镜像重建），Sealos 更新
5. 同步 README / INSTALL / LOCAL-DEPLOY / PROJECT 的版本信息
