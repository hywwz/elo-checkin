import { API_BASE_URL } from './api-config.js'

// 当前安装版本：与 src/manifest.json 的 versionName 保持一致（发新版时同步修改）
export const APP_VERSION = '1.0.2'

// 每个会话只自动弹一次更新提示，避免多页面重复打扰
let autoChecked = false

function isNewerVersion(latest, current) {
  const parse = v =>
    String(v)
      .replace(/^v/i, '')
      .split('.')
      .map(n => parseInt(n, 10) || 0)
  const a = parse(latest)
  const b = parse(current)
  for (let i = 0; i < Math.max(a.length, b.length); i += 1) {
    if ((a[i] || 0) > (b[i] || 0)) return true
    if ((a[i] || 0) < (b[i] || 0)) return false
  }
  return false
}

function requestUpdateInfo() {
  return new Promise((resolve, reject) => {
    uni.request({
      url: `${API_BASE_URL}/app/update`,
      method: 'GET',
      timeout: 10000,
      success: res => {
        const body = res && res.data
        if (body && body.code === 0 && body.data) {
          resolve(body.data)
        } else {
          reject(new Error('bad response'))
        }
      },
      fail: reject
    })
  })
}

function promptUpdate(info) {
  const latest = info.latestVersion
  if (!latest || !isNewerVersion(latest, APP_VERSION)) return
  uni.showModal({
    title: `发现新版本 v${latest}`,
    content: info.releaseNotes || '有新版本可以更新，是否立即下载？',
    confirmText: '立即更新',
    cancelText: '暂不',
    success: confirm => {
      if (!confirm.confirm) return
      if (info.downloadUrl) {
        // App 端用系统浏览器打开 APK 下载地址
        plus.runtime.openURL(info.downloadUrl)
      } else {
        uni.showToast({
          title: '新版本即将发布，请稍后再试',
          icon: 'none'
        })
      }
    }
  })
}

// 自动检查（每会话一次，静默失败）
export function checkForAppUpdate() {
  // #ifdef APP-PLUS
  if (autoChecked) return
  autoChecked = true
  requestUpdateInfo()
    .then(promptUpdate)
    .catch(() => {
      // 更新检查失败静默处理，不打扰正常使用
    })
  // #endif
}

// 手动检查（用户点击“检查更新”时调用，忽略会话内已检查标记）
export function forceCheckForAppUpdate() {
  // #ifdef APP-PLUS
  requestUpdateInfo()
    .then(promptUpdate)
    .catch(() => {
      uni.showToast({
        title: '检查更新失败，请稍后重试',
        icon: 'none'
      })
    })
  // #endif
}
