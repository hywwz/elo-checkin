# elo-notify

elo 打卡项目自研的本地定时通知 UTS 插件，无需付费授权，代码完全属于项目本身。

## 当前能力

- Android：请求通知权限、立即通知、按指定时间定时通知（App 被杀后仍由系统闹钟触发）、取消定时通知、跳转系统设置。
- iOS：待接入，接入后在 iOS 真机调试。

## 调用示例

```js
// #ifdef APP-PLUS
import {
  requestNotificationPermission,
  scheduleNotification,
  cancelScheduledNotification
} from '@/uni_modules/elo-notify'
// #endif

requestNotificationPermission(
  () => {
    scheduleNotification({
      id: 1001,
      title: '按时提醒',
      content: '现在是做「阅读」的好时候，哪怕只花两分钟也可以。',
      triggerAt: Date.now() + 60 * 1000
    })
  },
  () => {
    console.log('用户拒绝了通知权限')
  }
)
```
