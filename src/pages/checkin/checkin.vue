<template>
  <view class="page">
    <view class="wrap">
      <view class="home-head">
        <view class="head-copy">
          <text class="kicker">{{ dateLabel }}</text>
          <text class="title">{{ greeting }}，{{ displayName }}</text>
          <text class="sub">今天也给自己打个卡吧</text>
        </view>
        <view class="head-actions">
          <view class="nav-btn" @click="goStats">
            <view class="bar b1"></view>
            <view class="bar b2"></view>
            <view class="bar b3"></view>
          </view>
          <view class="nav-btn nav-account" @click="goAccount">
            <view class="shield-ico"></view>
          </view>
          <view class="avatar">{{ avatarText }}</view>
        </view>
      </view>

      <view class="today-head">
        <view class="th-left">
          <text class="th-title">今日打卡</text>
          <view class="streak">
            <text class="fire">✦</text>
            <text>已坚持 {{ streak }} 天</text>
          </view>
        </view>
        <view class="done-chip" :class="{ all: doneNum === visibleGoals.length && visibleGoals.length > 0 }">
          {{ doneNum }} / {{ visibleGoals.length }} 完成
        </view>
      </view>

      <view class="goal-list" v-if="visibleGoals.length">
        <view class="goal-row" v-for="(g, i) in visibleGoals" :key="g.id || i">
          <view class="g-check" :class="{ done: isDone(g.id) }" @click="toggle(g.id)">
            <text>✓</text>
          </view>
          <view class="goal-info">
            <text class="g-name">{{ g.name }}</text>
            <text class="g-task">{{ g.task || '（未填写具体任务）' }}</text>
            <text class="g-meta">{{ goalMeta(g) }}</text>
          </view>
          <view class="g-actions">
            <view class="g-act g-edit" @click="editGoal(g)">修改</view>
            <view class="g-act g-del" @click="askDelete(g)">删除</view>
          </view>
        </view>
      </view>

      <view v-else-if="goals.length" class="empty">
        <text class="empty-title">今天没有需要打卡的目标</text>
        <text class="empty-sub">好好休息，按自己的节奏来</text>
      </view>

      <view v-else class="empty">
        <text class="empty-title">还没有打卡目标</text>
        <text class="empty-sub">先设置一个想坚持的目标吧</text>
      </view>

      <view class="manage-card">
        <view class="manage-copy">
          <text class="m-title">目标管理</text>
          <text class="m-sub">日日行，不怕千万里；常常做，不怕千万事。</text>
        </view>
        <view class="manage-actions">
          <view class="manage-btn ghost" @click="goManageAll">全部目标</view>
          <view class="manage-btn" @click="goNew">＋ 新目标</view>
        </view>
      </view>

      <text class="foot-hint">记录只属于你自己，慢慢来也没关系</text>
    </view>
  </view>
</template>

<script>
import { get, post, del } from '../../utils/request.js'
import { checkForAppUpdate } from '../../utils/app-update.js'
import { confirmDeleteGoal } from '../../utils/goal-delete.js'
// #ifdef APP-PLUS
import {
  syncReminders,
  showMilestoneNotification,
  achievementEnabled,
  MILESTONES
} from '../../utils/reminder-scheduler.js'
// #endif

export default {
  data() {
    return {
      dateLabel: '',
      greeting: '你好',
      displayName: '朋友',
      avatarText: '友',
      goals: [],
      streak: 0,
      loading: true
    }
  },
  computed: {
    doneNum() {
      return this.visibleGoals.filter(g => g.doneToday).length
    },
    visibleGoals() {
      return this.goals.filter(g => g.visibleOnDate)
    }
  },
  onShow() {
    this.setDate()
    this.setGreeting()
    this.setUserInfo()
    this.fetchGoals()
    checkForAppUpdate()
  },
  methods: {
    setDate() {
      const d = new Date()
      const week = ['日', '一', '二', '三', '四', '五', '六']
      this.dateLabel = `${d.getMonth() + 1}月${d.getDate()}日 · 星期${week[d.getDay()]}`
    },
    setGreeting() {
      const hour = new Date().getHours()
      if (hour >= 5 && hour < 9) {
        this.greeting = '早上好'
      } else if (hour >= 9 && hour < 12) {
        this.greeting = '上午好'
      } else if (hour >= 12 && hour < 14) {
        this.greeting = '中午好'
      } else if (hour >= 14 && hour < 18) {
        this.greeting = '下午好'
      } else {
        this.greeting = '晚上好'
      }
    },
    setUserInfo() {
      const user = uni.getStorageSync('eloUser')
      const name = (user && user.nickname) || ''
      this.displayName = name || '朋友'
      this.avatarText = name ? name.charAt(0) : '友'
    },
    dateStr(d) {
      const p = n => String(n).padStart(2, '0')
      return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
    },
    isDone(id) {
      const g = this.goals.find(x => x.id === id)
      return Boolean(g && g.doneToday)
    },
    goalMeta(g) {
      const f = g.freq || { mode: 'daily' }
      if (f.mode === 'count') {
        return `每周 ${f.count} 次 · 本周已完成 ${g.weeklyDone || 0}/${f.count} · ${g.reminderTime} 提醒`
      }
      if (f.mode === 'days') {
        const names = ['一', '二', '三', '四', '五', '六', '日']
        const text = f.days.map(n => names[n - 1]).join('、')
        return `每周${text} · ${g.reminderTime} 提醒`
      }
      return `每天 1 次 · ${g.reminderTime} 提醒`
    },
    async fetchGoals() {
      this.loading = true
      try {
        const date = this.dateStr(new Date())
        const data = await get(`/goals?date=${date}`)
        this.goals = data.goals || []
        this.streak = data.streak || 0
        // #ifdef APP-PLUS
        syncReminders(this.goals)
        // #endif
      } catch (err) {
        // 请求层已提示
      } finally {
        this.loading = false
      }
    },
    async toggle(id) {
      try {
        const beforeStreak = this.streak || 0
        if (this.isDone(id)) {
          await del('/checkins/today', { goalId: id })
          uni.showToast({ title: '已取消今日打卡', icon: 'none' })
        } else {
          await post('/checkins', { goalId: id })
          if (this.doneNum + 1 === this.visibleGoals.length) {
            uni.showToast({ title: '今日目标全部完成', icon: 'success' })
          } else {
            uni.showToast({ title: '打卡成功', icon: 'success' })
          }
        }
        await this.fetchGoals()
        // #ifdef APP-PLUS
        this.checkMilestone(beforeStreak)
        // #endif
      } catch (err) {
        // 请求层已提示
      }
    },
    askDelete(g) {
      confirmDeleteGoal(async () => {
        try {
          await del(`/goals/${encodeURIComponent(g.id)}`)
          uni.showToast({ title: '已删除', icon: 'success' })
          await this.fetchGoals()
        } catch (err) {
          // 请求层已提示
        }
      })
    },
    checkMilestone(beforeStreak) {
      if (!achievementEnabled()) return
      const current = this.streak || 0
      const reached = MILESTONES.filter((days) => current >= days && beforeStreak < days)
      if (!reached.length) return
      showMilestoneNotification(reached[reached.length - 1])
    },
    goStats() {
      uni.navigateTo({ url: '/pages/statistics/statistics' })
    },
    goAccount() {
      uni.navigateTo({ url: '/pages/account-security/account-security' })
    },
    goNew() {
      uni.navigateTo({ url: '/pages/set-goal/set-goal' })
    },
    goManageAll() {
      uni.navigateTo({ url: '/pages/manage-goals/manage-goals' })
    },
    editGoal(g) {
      uni.navigateTo({ url: `/pages/edit-goal/edit-goal?id=${encodeURIComponent(g.id)}` })
    }
  }
}
</script>

<style scoped>
.page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background:
    radial-gradient(420rpx 320rpx at 92% -2%, rgba(16, 185, 129, 0.10), rgba(16, 185, 129, 0) 70%),
    linear-gradient(180deg, #F9FCFA 0%, #F3F8F5 100%);
}
.wrap {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 34rpx 42rpx 30rpx;
}
.home-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20rpx;
}
.kicker {
  display: block;
  font-size: 22rpx;
  font-weight: 700;
  color: #0E9F6E;
}
.title {
  display: block;
  font-size: 50rpx;
  font-weight: 800;
  color: #101828;
  margin-top: 8rpx;
}
.sub {
  display: block;
  font-size: 24rpx;
  color: #74819A;
  margin-top: 6rpx;
}
.head-actions {
  display: flex;
  align-items: center;
  gap: 18rpx;
}
.nav-btn {
  width: 82rpx;
  height: 82rpx;
  border-radius: 28rpx;
  background: #fff;
  border: 2rpx solid #E2E7F0;
  box-shadow: 0 10rpx 22rpx -14rpx rgba(30, 55, 80, 0.45);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  gap: 6rpx;
  padding-bottom: 22rpx;
}
.bar {
  width: 8rpx;
  border-radius: 4rpx;
  background: #0B9D60;
}
.b1 {
  height: 16rpx;
}
.b2 {
  height: 26rpx;
}
.b3 {
  height: 36rpx;
}
.nav-account {
  color: #0B7A4E;
}
.shield-ico {
  width: 21rpx;
  height: 25rpx;
  background: currentColor;
  clip-path: polygon(50% 0%, 96% 12%, 88% 56%, 72% 84%, 50% 100%, 28% 84%, 12% 56%, 4% 12%);
}
.avatar {
  width: 104rpx;
  height: 104rpx;
  border-radius: 34rpx;
  background: linear-gradient(145deg, #22C55E, #047857);
  color: #fff;
  font-size: 38rpx;
  font-weight: 800;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 18rpx 34rpx -16rpx rgba(16, 150, 90, 0.7);
}
.today-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 46rpx;
}
.th-left {
  display: flex;
  align-items: center;
  gap: 16rpx;
}
.th-title {
  font-size: 28rpx;
  font-weight: 800;
  color: #243042;
}
.streak {
  display: flex;
  align-items: center;
  font-size: 19rpx;
  font-weight: 700;
  color: #0B7A4E;
  background: #E8F9F0;
  border: 2rpx solid #BCEBCE;
  border-radius: 999rpx;
  padding: 6rpx 16rpx;
}
.fire {
  color: #F59E0B;
  margin-right: 6rpx;
}
.done-chip {
  font-size: 20rpx;
  font-weight: 800;
  color: #0B7A4E;
  background: #E8F9F0;
  border-radius: 999rpx;
  padding: 8rpx 18rpx;
}
.done-chip.all {
  background: linear-gradient(135deg, #22C55E, #0BA360);
  color: #fff;
}
.goal-list {
  margin-top: 24rpx;
}
.goal-row {
  display: flex;
  align-items: center;
  gap: 22rpx;
  background: #fff;
  border: 2rpx solid #E2EFE7;
  border-radius: 34rpx;
  padding: 22rpx 24rpx;
  box-shadow: 0 18rpx 36rpx -30rpx rgba(20, 65, 46, 0.7);
  margin-bottom: 18rpx;
}
.g-check {
  width: 64rpx;
  height: 64rpx;
  flex-shrink: 0;
  border-radius: 50%;
  border: 3rpx solid #C9D6E8;
  color: transparent;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 30rpx;
  font-weight: 800;
}
.g-check.done {
  background: linear-gradient(135deg, #22C55E, #0BA360);
  border-color: transparent;
  color: #fff;
  box-shadow: 0 10rpx 20rpx -8rpx rgba(13, 148, 90, 0.6);
}
.goal-info {
  flex: 1;
  min-width: 0;
}
.g-name {
  display: block;
  font-size: 28rpx;
  font-weight: 800;
  color: #243042;
}
.g-task {
  display: block;
  font-size: 22rpx;
  color: #7E8CA3;
  margin-top: 2rpx;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.g-meta {
  display: block;
  font-size: 18rpx;
  color: #A0AABE;
  margin-top: 4rpx;
}
.g-actions {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 10rpx;
}
.g-act {
  min-width: 84rpx;
  text-align: center;
  font-size: 20rpx;
  font-weight: 700;
  border-radius: 16rpx;
  padding: 8rpx 14rpx;
}
.g-edit {
  color: #0B7A4E;
  background: #E8F9F0;
}
.g-del {
  color: #C5484C;
  background: #FFF2F2;
}
.empty {
  margin-top: 40rpx;
  padding: 70rpx 20rpx;
  background: #fff;
  border-radius: 34rpx;
  text-align: center;
}
.empty-title {
  display: block;
  font-size: 30rpx;
  font-weight: 800;
  color: #243042;
}
.empty-sub {
  display: block;
  margin-top: 12rpx;
  font-size: 22rpx;
  color: #9AA6BA;
}
.manage-card {
  display: flex;
  align-items: center;
  gap: 20rpx;
  background: #fff;
  border: 2rpx solid #E2EFE7;
  border-radius: 36rpx;
  padding: 24rpx;
  box-shadow: 0 18rpx 36rpx -32rpx rgba(20, 65, 46, 0.8);
  margin-top: 6rpx;
}
.manage-copy {
  flex: 1;
  min-width: 0;
}
.m-title {
  display: block;
  font-size: 26rpx;
  font-weight: 800;
  color: #243042;
}
.m-sub {
  display: block;
  font-size: 19rpx;
  color: #A0AABE;
  margin-top: 4rpx;
}
.manage-actions {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}
.manage-btn {
  font-size: 24rpx;
  font-weight: 800;
  color: #fff;
  background: linear-gradient(135deg, #22C55E, #0BA360);
  border-radius: 24rpx;
  padding: 18rpx 26rpx;
  box-shadow: 0 14rpx 24rpx -12rpx rgba(13, 148, 90, 0.8);
}
.manage-btn.ghost {
  color: #0B7A4E;
  background: #E8F9F0;
  box-shadow: none;
}
.foot-hint {
  display: block;
  text-align: center;
  margin-top: auto;
  padding-top: 22rpx;
  font-size: 20rpx;
  color: #9AA6BA;
  letter-spacing: 1rpx;
}
</style>
