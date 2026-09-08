<template>
  <view class="page">
    <view class="wrap">
      <view class="tip-card">
        <text class="tip-title">真机提醒测试</text>
        <text class="tip-sub">
          先“请求权限”，再排一条 1 分钟后的通知，点击后立刻按 Home 或锁屏；验证能准时弹，再试“杀进程”与“明晚 22:00”。
        </text>
      </view>

      <view class="section-head">
        <text class="section-title">权限状态</text>
        <text class="section-sub">{{ platformText }}</text>
      </view>
      <view class="status-card">
        <view class="status-row">
          <text class="s-label">通知权限</text>
          <text class="s-value" :class="noticeOk ? 'ok' : 'bad'">{{ noticeOk ? '已开启' : '未开启' }}</text>
        </view>
        <view class="status-row">
          <text class="s-label">闹钟和提醒（精确到秒）</text>
          <text class="s-value" :class="exactOk ? 'ok' : 'bad'">{{ exactOk ? '已开启' : '未开启' }}</text>
        </view>
      </view>
      <view class="btn-row">
        <view class="btn half" @click="requestPermission">请求通知权限</view>
        <view class="btn half ghost" @click="openNotifySettings">系统设置</view>
      </view>
      <view class="btn-row">
        <view class="btn half ghost" @click="openAlarmSettings">闹钟和提醒设置</view>
        <view class="btn half ghost" @click="refreshStatus">刷新状态</view>
      </view>

      <view class="section-head">
        <text class="section-title">通知测试</text>
      </view>
      <view class="test-card">
        <view class="test-row" @click="showNow">
          <view class="test-copy">
            <text class="t-title">立即通知</text>
            <text class="t-sub">先验证通知样式与点击打开</text>
          </view>
          <text class="t-arrow">›</text>
        </view>
        <view class="test-row" @click="scheduleOneMinute">
          <view class="test-copy">
            <text class="t-title">1 分钟后定时</text>
            <text class="t-sub">点完立刻按 Home / 锁屏等待</text>
          </view>
          <text class="t-arrow">›</text>
        </view>
        <view class="test-row" @click="scheduleNext2200">
          <view class="test-copy">
            <text class="t-title">下次 22:00 风险提醒</text>
            <text class="t-sub">模拟当天未打卡的临期提醒</text>
          </view>
          <text class="t-arrow">›</text>
        </view>
      </view>

      <view class="scheduled-card" v-if="scheduled.length">
        <view class="scheduled-row" v-for="item in scheduled" :key="item.id">
          <view class="sc-copy">
            <text class="sc-title">{{ item.label }}</text>
            <text class="sc-sub">ID {{ item.id }} · {{ item.time }}</text>
          </view>
          <view class="sc-cancel" @click="cancelOne(item.id)">取消</view>
        </view>
      </view>

      <text class="result-msg" v-if="result">{{ result }}</text>
    </view>
  </view>
</template>

<script>
// #ifdef APP-PLUS
import {
  requestNotificationPermission,
  showNotification,
  scheduleNotification,
  cancelScheduledNotification,
  isNotificationEnabled,
  isExactAlarmEnabled,
  openNotificationSettings,
  openExactAlarmSettings
} from '@/uni_modules/elo-notify'
// #endif

export default {
  data() {
    return {
      platformText: 'App',
      noticeOk: false,
      exactOk: false,
      result: '',
      scheduled: []
    }
  },
  onLoad() {
    this.refreshStatus()
  },
  onShow() {
    this.refreshStatus()
  },
  methods: {
    refreshStatus() {
      const info = uni.getSystemInfoSync()
      const platform = info.platform || ''
      this.platformText = platform === 'android' ? `Android ${info.system || ''}` : platform
      // #ifdef APP-PLUS
      try {
        this.noticeOk = Boolean(isNotificationEnabled())
        this.exactOk = Boolean(isExactAlarmEnabled())
      } catch (err) {
        this.noticeOk = false
        this.exactOk = false
      }
      // #endif
    },
    requestPermission() {
      // #ifdef APP-PLUS
      requestNotificationPermission(
        (allRight) => {
          this.noticeOk = Boolean(allRight)
          this.result = allRight ? '通知权限已开启' : '通知权限未全部开启'
          this.refreshStatus()
        },
        () => {
          this.result = '未获得通知权限，可点“系统设置”手动开启'
        }
      )
      // #endif
    },
    openNotifySettings() {
      // #ifdef APP-PLUS
      openNotificationSettings()
      // #endif
    },
    openAlarmSettings() {
      // #ifdef APP-PLUS
      openExactAlarmSettings()
      // #endif
    },
    showNow() {
      // #ifdef APP-PLUS
      const id = showNotification({
        id: 90001,
        title: 'elo 打卡',
        content: '通知测试成功：样式、声音与横幅已就位。',
        channelId: 'elo_reminder_banner',
        channelName: '打卡提醒'
      })
      this.result = id > 0 ? '已发送立即通知' : '发送失败，请先检查通知权限'
      // #endif
    },
    scheduleOneMinute() {
      this.scheduleDemo(91001, '1 分钟后定时', Date.now() + 60 * 1000, true)
    },
    scheduleNext2200() {
      const now = new Date()
      const target = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 22, 0, 0, 0)
      if (target.getTime() <= now.getTime()) {
        target.setDate(target.getDate() + 1)
      }
      this.scheduleDemo(
        91003,
        '下次 22:00 风险提醒',
        target.getTime(),
        true,
        '距离今天结束还有 2 小时，如果现在有空，试着做做「阅读」吧。连续纪录断了有点可惜，但只要愿意，重新开始也依然值得。'
      )
    },
    scheduleDemo(id, label, triggerAt, exact, customContent) {
      // #ifdef APP-PLUS
      const idNum = scheduleNotification({
        id,
        title: 'elo 打卡提醒',
        content: customContent || '现在是做「阅读」的好时候，哪怕只花两分钟也可以。',
        channelId: 'elo_reminder_banner',
        channelName: '打卡提醒',
        triggerAt,
        exact
      })
      if (idNum > 0) {
        this.result = `已安排：${label}（${this.fmt(triggerAt)}）`
        const exists = this.scheduled.findIndex((s) => s.id === id)
        const row = { id, label, time: this.fmt(triggerAt) }
        if (exists >= 0) {
          this.scheduled.splice(exists, 1, row)
        } else {
          this.scheduled.push(row)
        }
        this.refreshStatus()
      } else {
        this.result = exact
          ? '安排失败：请先开启“闹钟和提醒”权限（可在上方进入设置）'
          : '安排失败：请检查通知权限'
      }
      // #endif
    },
    cancelOne(id) {
      // #ifdef APP-PLUS
      cancelScheduledNotification(id)
      this.scheduled = this.scheduled.filter((s) => s.id !== id)
      this.result = `已取消 ID ${id}`
      // #endif
    },
    fmt(ts) {
      const d = new Date(ts)
      const pad = (n) => (n < 10 ? '0' + n : '' + n)
      return `${d.getMonth() + 1}月${d.getDate()}日 ${pad(d.getHours())}:${pad(d.getMinutes())}`
    }
  }
}
</script>

<style scoped>
.page {
  min-height: 100vh;
  background:
    radial-gradient(460rpx 320rpx at 92% -2%, rgba(16, 185, 129, 0.1), rgba(16, 185, 129, 0) 70%),
    linear-gradient(180deg, #f9fcfa 0%, #f3f8f5 100%);
  display: flex;
  flex-direction: column;
}
.wrap {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 30rpx 38rpx;
}
.tip-card {
  background: #e8f9f0;
  border: 2rpx solid #bcebce;
  border-radius: 30rpx;
  padding: 26rpx;
}
.tip-title {
  display: block;
  font-size: 27rpx;
  font-weight: 800;
  color: #0b5d3c;
}
.tip-sub {
  display: block;
  margin-top: 8rpx;
  font-size: 21rpx;
  line-height: 1.6;
  color: #3f6b56;
}
.section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 34rpx 4rpx 16rpx;
}
.section-title {
  font-size: 25rpx;
  font-weight: 800;
  color: #243042;
}
.section-sub {
  font-size: 18rpx;
  color: #9aa6ba;
}
.status-card {
  background: #fff;
  border: 2rpx solid #e2efe7;
  border-radius: 30rpx;
  padding: 4rpx 26rpx;
}
.status-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx 0;
}
.status-row + .status-row {
  border-top: 2rpx solid #eef2f7;
}
.s-label {
  font-size: 23rpx;
  color: #46506a;
}
.s-value {
  font-size: 23rpx;
  font-weight: 800;
}
.s-value.ok {
  color: #0b7a4e;
}
.s-value.bad {
  color: #c5484c;
}
.btn-row {
  display: flex;
  gap: 18rpx;
  margin-top: 18rpx;
}
.btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 84rpx;
  border-radius: 26rpx;
  font-size: 24rpx;
  font-weight: 800;
  background: linear-gradient(135deg, #22c55e, #047857);
  color: #fff;
  box-shadow: 0 16rpx 30rpx -18rpx rgba(13, 148, 90, 0.7);
}
.btn.ghost {
  background: #fff;
  color: #0b7a4e;
  border: 2rpx solid #bcebce;
  box-shadow: none;
}
.test-card {
  background: #fff;
  border: 2rpx solid #e2efe7;
  border-radius: 30rpx;
  padding: 2rpx 26rpx;
}
.test-row {
  display: flex;
  align-items: center;
  padding: 24rpx 0;
}
.test-row + .test-row {
  border-top: 2rpx solid #eef2f7;
}
.test-copy {
  flex: 1;
  min-width: 0;
}
.t-title {
  display: block;
  font-size: 25rpx;
  font-weight: 800;
  color: #243042;
}
.t-sub {
  display: block;
  margin-top: 5rpx;
  font-size: 19rpx;
  color: #8e9aaf;
}
.t-arrow {
  font-size: 36rpx;
  color: #c0cada;
  font-weight: 700;
}
.scheduled-card {
  margin-top: 24rpx;
  background: #fff;
  border: 2rpx solid #f0d9a8;
  border-radius: 30rpx;
  padding: 2rpx 26rpx;
}
.scheduled-row {
  display: flex;
  align-items: center;
  padding: 20rpx 0;
}
.scheduled-row + .scheduled-row {
  border-top: 2rpx solid #f4ead3;
}
.sc-copy {
  flex: 1;
  min-width: 0;
}
.sc-title {
  display: block;
  font-size: 23rpx;
  font-weight: 800;
  color: #243042;
}
.sc-sub {
  display: block;
  margin-top: 4rpx;
  font-size: 18rpx;
  color: #8e9aaf;
}
.sc-cancel {
  font-size: 21rpx;
  color: #c5484c;
  font-weight: 700;
  padding: 10rpx 12rpx;
}
.result-msg {
  display: block;
  margin-top: 26rpx;
  font-size: 21rpx;
  color: #0b7a4e;
  line-height: 1.5;
}
</style>
