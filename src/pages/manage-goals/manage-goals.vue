<template>
  <view class="page">
    <view class="wrap">
      <view class="head">
        <text class="head-title">全部目标</text>
        <text class="head-sub">包含今天不需要打卡的目标，共 {{ goals.length }} 个</text>
      </view>

      <view v-if="loading" class="empty">
        <text class="empty-title">正在加载…</text>
      </view>

      <view v-else-if="goals.length" class="goal-list">
        <view class="goal-row" v-for="g in goals" :key="g.id">
          <view class="goal-info">
            <view class="name-row">
              <text class="g-name">{{ g.name }}</text>
              <text v-if="!g.visibleOnDate" class="off-tag">今天无需打卡</text>
            </view>
            <text class="g-task">{{ g.task || '（未填写具体任务）' }}</text>
            <text class="g-meta">{{ goalMeta(g) }}</text>
          </view>
          <view class="g-actions">
            <view class="g-act g-edit" @click="editGoal(g)">修改</view>
            <view class="g-act g-del" @click="askDelete(g)">删除</view>
          </view>
        </view>
      </view>

      <view v-else class="empty">
        <text class="empty-title">还没有打卡目标</text>
        <text class="empty-sub">先设置一个想坚持的目标吧</text>
      </view>

      <view class="new-btn" @click="goNew">＋ 新目标</view>
    </view>
  </view>
</template>

<script>
import { get, del } from '../../utils/request.js'
import { confirmDeleteGoal } from '../../utils/goal-delete.js'

export default {
  data() {
    return {
      goals: [],
      loading: true
    }
  },
  onShow() {
    this.fetchGoals()
  },
  methods: {
    dateStr(d) {
      const p = n => String(n).padStart(2, '0')
      return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
    },
    async fetchGoals() {
      this.loading = true
      try {
        const date = this.dateStr(new Date())
        const data = await get(`/goals?date=${date}`)
        this.goals = data.goals || []
      } catch (err) {
        // 请求层已提示
      } finally {
        this.loading = false
      }
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
    editGoal(g) {
      uni.navigateTo({
        url: `/pages/edit-goal/edit-goal?id=${encodeURIComponent(g.id)}`
      })
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
    goNew() {
      uni.navigateTo({ url: '/pages/set-goal/set-goal' })
    }
  }
}
</script>

<style scoped>
.page {
  min-height: 100vh;
  background:
    radial-gradient(420rpx 320rpx at 92% -2%, rgba(16, 185, 129, 0.1), rgba(16, 185, 129, 0) 70%),
    linear-gradient(180deg, #f9fcfa 0%, #f3f8f5 100%);
}
.wrap {
  display: flex;
  flex-direction: column;
  padding: 34rpx 42rpx 40rpx;
}
.head {
  margin-bottom: 24rpx;
}
.head-title {
  display: block;
  font-size: 42rpx;
  font-weight: 800;
  color: #101828;
}
.head-sub {
  display: block;
  margin-top: 8rpx;
  font-size: 22rpx;
  color: #74819a;
}
.goal-list {
  display: flex;
  flex-direction: column;
  gap: 18rpx;
}
.goal-row {
  display: flex;
  align-items: center;
  gap: 16rpx;
  background: #fff;
  border: 2rpx solid #e2efe7;
  border-radius: 30rpx;
  padding: 22rpx 22rpx 22rpx 26rpx;
  box-shadow: 0 18rpx 36rpx -30rpx rgba(20, 65, 46, 0.7);
}
.goal-info {
  flex: 1;
  min-width: 0;
}
.name-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
}
.g-name {
  font-size: 27rpx;
  font-weight: 800;
  color: #243042;
}
.off-tag {
  flex-shrink: 0;
  font-size: 16rpx;
  font-weight: 700;
  color: #9aa6ba;
  background: #f1f4f8;
  border-radius: 999rpx;
  padding: 4rpx 12rpx;
}
.g-task {
  display: block;
  margin-top: 4rpx;
  font-size: 21rpx;
  color: #7e8ca3;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.g-meta {
  display: block;
  margin-top: 6rpx;
  font-size: 18rpx;
  color: #a0aabe;
}
.g-actions {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}
.g-act {
  min-width: 76rpx;
  text-align: center;
  font-size: 21rpx;
  font-weight: 700;
  border-radius: 18rpx;
  padding: 10rpx 12rpx;
}
.g-edit {
  color: #0b7a4e;
  background: #e8f9f0;
}
.g-del {
  color: #c5484c;
  background: #fff2f2;
}
.empty {
  margin-top: 20rpx;
  padding: 80rpx 20rpx;
  background: #fff;
  border-radius: 34rpx;
  text-align: center;
}
.empty-title {
  display: block;
  font-size: 28rpx;
  font-weight: 800;
  color: #243042;
}
.empty-sub {
  display: block;
  margin-top: 8rpx;
  font-size: 21rpx;
  color: #9aa6ba;
}
.new-btn {
  margin-top: 28rpx;
  height: 92rpx;
  border-radius: 30rpx;
  background: linear-gradient(135deg, #22c55e, #0ba360);
  color: #fff;
  font-size: 26rpx;
  font-weight: 800;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 18rpx 34rpx -16rpx rgba(16, 150, 90, 0.65);
}
</style>
