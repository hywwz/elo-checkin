// App 更新信息配置
//
// 发布新版本时只需修改本文件，并重新推送触发后端镜像构建，
// 然后把新 APK 上传到 GitHub Releases（或自行托管的静态地址）。

export const APP_UPDATE = {
  // 与 src/manifest.json 中 versionName 保持一致（不带 v 前缀）
  latestVersion: '1.0.4',
  // APK 下载地址：上传到 GitHub Releases 后形如
  // https://github.com/hywwz/elo-checkin/releases/download/v1.0.4/xxx.apk
  downloadUrl: 'https://github.com/hywwz/elo-checkin/releases/download/v1.0.4/elo-checkin-v1.0.4.apk',
  // 更新说明（可选）
  releaseNotes: 'v1.0.4：目标管理支持删除与全部目标入口，登录后直进打卡主页，修复小米手机横幅通知不弹出'
}
