<template>
  <view class="page">
    <view class="wrap">
      <view class="user-card">
        <view class="avatar">{{ avatarText }}</view>
        <view class="user-copy">
          <text class="name">{{ nickname }}</text>
          <text class="account">{{ account }}</text>
        </view>
        <view class="user-tag">目标 {{ goals.length }} 个</view>
      </view>

      <view v-if="loading" class="empty">
        <text class="empty-title">正在加载打卡记录…</text>
      </view>

      <template v-else>
        <view class="section-head">
          <text class="section-title">目标与完成情况</text>
        </view>
        <view v-if="goals.length" class="goal-list">
          <view v-for="g in goals" :key="g.id" class="goal-row">
            <view class="goal-copy">
              <text class="goal-name">{{ g.name }}</text>
              <text class="goal-task">{{ g.task }}</text>
            </view>
            <view class="goal-count">
              <text class="num">{{ g.totalCheckins }}</text>
              <text class="unit">次打卡</text>
            </view>
          </view>
        </view>
        <view v-else class="empty small">
          <text class="empty-title">该用户还没有目标</text>
        </view>

        <view class="section-head">
          <text class="section-title">打卡记录</text>
          <text class="section-sub">共 {{ records.length }} 条</text>
        </view>
        <view v-if="groupedRecords.length" class="record-list">
          <view v-for="group in groupedRecords" :key="group.date" class="record-group">
            <view class="date-row">
              <text class="date">{{ group.date }}</text>
              <text class="date-count">{{ group.items.length }} 项完成</text>
            </view>
            <view v-for="item in group.items" :key="item.id" class="record-row">
              <view class="check-dot"></view>
              <text class="goal-name">{{ item.goalName }}</text>
              <text class="record-time">{{ timeLabel(item.createdAt) }}</text>
            </view>
          </view>
        </view>
        <view v-else class="empty small">
          <text class="empty-title">该用户还没有打卡记录</text>
        </view>

        <view class="kick-btn" :class="{ disabled: kicking }" @click="confirmKick">
          <text>{{ kicking ? '正在下线…' : '强制下线该用户' }}</text>
        </view>
        <view class="reset-btn" :class="{ disabled: resetting }" @click="confirmReset">
          <text>{{ resetting ? '正在重置…' : '重置该用户密码' }}</text>
        </view>
        <view class="delete-btn" :class="{ disabled: deleting }" @click="confirmDelete">
          <text>{{ deleting ? '正在删除…' : '删除该用户' }}</text>
        </view>
      </template>
    </view>
  </view>
</template>

<script>
import { del, get, post } from '../../utils/request.js'

export default {
  data() {
    return {
      userId: '',
      account: '',
      nickname: '用户',
      goals: [],
      records: [],
      loading: true,
      kicking: false,
      resetting: false,
      deleting: false
    }
  },
  computed: {
    avatarText() {
      return (this.nickname || this.account || '?').charAt(0)
    },
    groupedRecords() {
      const map = {}
      this.records.forEach(r => {
        if (!map[r.date]) map[r.date] = []
        map[r.date].push(r)
      })
      return Object.keys(map)
        .sort((a, b) => (a < b ? 1 : -1))
        .map(date => ({ date, items: map[date] }))
    }
  },
  onLoad(options) {
    this.userId = decodeURIComponent(options.id || '')
    this.account = decodeURIComponent(options.account || '')
    this.nickname = decodeURIComponent(options.nickname || '用户')
    this.fetchRecords()
  },
  methods: {
    timeLabel(iso) {
      if (!iso) return ''
      const s = iso.replace('T', ' ').slice(0, 16)
      return s.slice(11)
    },
    async fetchRecords() {
      this.loading = true
      try {
        const data = await get(`/admin/users/${encodeURIComponent(this.userId)}/records`)
        if (data.user) {
          this.account = data.user.account
          this.nickname = data.user.nickname
        }
        this.goals = data.goals || []
        this.records = data.records || []
      } catch (err) {
        // 请求层已提示
      } finally {
        this.loading = false
      }
    },
    confirmKick() {
      uni.showModal({
        title: '强制下线',
        content: `确定让「${this.nickname}」立即下线吗？该用户下次操作会被打回登录页。`,
        confirmText: '强制下线',
        confirmColor: '#E5484D',
        success: res => {
          if (res.confirm) this.doKick()
        }
      })
    },
    async doKick() {
      if (this.kicking) return
      this.kicking = true
      try {
        await post(`/admin/users/${encodeURIComponent(this.userId)}/logout`)
        uni.showToast({ title: '已强制下线', icon: 'success' })
      } catch (err) {
        // 请求层已提示
      } finally {
        this.kicking = false
      }
    },
    confirmReset() {
      uni.showModal({
        title: '重置密码',
        content: `确定重置「${this.nickname}」的密码吗？会生成临时密码并使其所有登录失效。`,
        confirmText: '重置',
        confirmColor: '#E5484D',
        success: res => {
          if (res.confirm) this.doReset()
        }
      })
    },
    async doReset() {
      if (this.resetting) return
      this.resetting = true
      try {
        const data = await post(
          `/admin/users/${encodeURIComponent(this.userId)}/reset-password`
        )
        const temp = data.temporaryPassword
        uni.showModal({
          title: '临时密码已生成',
          content: `请尽快把下面的临时密码告知用户，并提醒登录后修改：\n\n${temp}`,
          showCancel: false,
          confirmText: '复制密码',
          success: res => {
            if (res.confirm) {
              uni.setClipboardData({ data: temp })
            }
          }
        })
      } catch (err) {
        // 请求层已提示
      } finally {
        this.resetting = false
      }
    },
    confirmDelete() {
      uni.showModal({
        title: '删除用户',
        content: `确定删除用户「${this.nickname}」吗？该用户的目标、打卡记录和登录会话将一并删除，且不可恢复。`,
        confirmText: '删除',
        confirmColor: '#E5484D',
        success: res => {
          if (res.confirm) this.doDelete()
        }
      })
    },
    async doDelete() {
      if (this.deleting) return
      this.deleting = true
      try {
        await del(`/admin/users/${encodeURIComponent(this.userId)}/delete`)
        uni.showToast({ title: '用户已删除', icon: 'success' })
        setTimeout(() => uni.navigateBack(), 600)
      } catch (err) {
        // 请求层已提示
      } finally {
        this.deleting = false
      }
    }
  }
}
</script>

<style scoped>
.page {
  min-height: 100vh;
  background:
    radial-gradient(460rpx 320rpx at 92% -2%, rgba(37, 99, 235, 0.07), rgba(37, 99, 235, 0) 70%),
    linear-gradient(180deg, #F9FCFA 0%, #F3F8F5 100%);
}
.wrap {
  display: flex;
  flex-direction: column;
  padding: 34rpx 42rpx 40rpx;
}
.user-card {
  display: flex;
  align-items: center;
  gap: 20rpx;
  background: #fff;
  border: 2rpx solid #E2EFE7;
  border-radius: 34rpx;
  padding: 24rpx;
  box-shadow: 0 18rpx 38rpx -30rpx rgba(20, 65, 46, 0.7);
}
.avatar {
  width: 88rpx;
  height: 88rpx;
  flex-shrink: 0;
  border-radius: 30rpx;
  background: linear-gradient(145deg, #22C55E, #047857);
  color: #fff;
  font-size: 32rpx;
  font-weight: 800;
  display: flex;
  align-items: center;
  justify-content: center;
}
.user-copy {
  flex: 1;
  min-width: 0;
}
.name {
  display: block;
  font-size: 32rpx;
  font-weight: 800;
  color: #101828;
}
.account {
  display: block;
  font-size: 21rpx;
  color: #8E9AAF;
  margin-top: 5rpx;
  word-break: break-all;
}
.user-tag {
  flex-shrink: 0;
  font-size: 18rpx;
  font-weight: 800;
  color: #0B7A4E;
  background: #E8F9F0;
  border-radius: 999rpx;
  padding: 6rpx 14rpx;
}
.section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 38rpx 6rpx 16rpx;
}
.section-title {
  font-size: 26rpx;
  font-weight: 800;
  color: #243042;
}
.section-sub {
  font-size: 19rpx;
  color: #9AA6BA;
}
.goal-list,
.record-list {
  display: flex;
  flex-direction: column;
  gap: 14rpx;
}
.goal-row {
  display: flex;
  align-items: center;
  gap: 16rpx;
  background: #fff;
  border: 2rpx solid #E2EFE7;
  border-radius: 26rpx;
  padding: 20rpx 22rpx;
}
.goal-copy {
  flex: 1;
  min-width: 0;
}
.goal-name {
  display: block;
  font-size: 26rpx;
  font-weight: 800;
  color: #243042;
}
.goal-task {
  display: block;
  font-size: 20rpx;
  color: #7E8CA3;
  margin-top: 4rpx;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.goal-count {
  flex-shrink: 0;
  text-align: right;
}
.goal-count .num {
  display: block;
  font-size: 34rpx;
  font-weight: 800;
  color: #0B7A4E;
  line-height: 1.1;
}
.goal-count .unit {
  font-size: 17rpx;
  color: #9AA6BA;
}
.record-group {
  background: #fff;
  border: 2rpx solid #E2EFE7;
  border-radius: 26rpx;
  padding: 16rpx 22rpx;
}
.date-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 12rpx;
  border-bottom: 2rpx solid #EEF2F7;
}
.date {
  font-size: 23rpx;
  font-weight: 800;
  color: #243042;
}
.date-count {
  font-size: 18rpx;
  color: #0B7A4E;
  font-weight: 700;
}
.record-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding: 14rpx 0;
}
.record-row + .record-row {
  border-top: 2rpx solid #F2F5F8;
}
.check-dot {
  width: 18rpx;
  height: 18rpx;
  border-radius: 50%;
  background: linear-gradient(135deg, #22C55E, #0BA360);
}
.record-row .goal-name {
  flex: 1;
  font-size: 23rpx;
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.record-time {
  font-size: 19rpx;
  color: #A0AABE;
}
.kick-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 40rpx;
  height: 92rpx;
  border-radius: 30rpx;
  background: #FFF8ED;
  border: 2rpx solid #F6DFC3;
  color: #B45309;
  font-size: 25rpx;
  font-weight: 800;
  letter-spacing: 2rpx;
}
.kick-btn.disabled {
  opacity: 0.7;
}
.reset-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 40rpx;
  height: 92rpx;
  border-radius: 30rpx;
  background: #FFF7F7;
  border: 2rpx solid #F6D9DA;
  color: #C5484C;
  font-size: 25rpx;
  font-weight: 800;
  letter-spacing: 2rpx;
}
.reset-btn.disabled {
  opacity: 0.7;
}
.delete-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 20rpx;
  height: 88rpx;
  border-radius: 30rpx;
  background: #fff;
  border: 2rpx solid #F6D9DA;
  color: #E5484D;
  font-size: 25rpx;
  font-weight: 800;
  letter-spacing: 2rpx;
}
.delete-btn.disabled {
  opacity: 0.7;
}
.empty {
  margin-top: 40rpx;
  padding: 70rpx 20rpx;
  background: #fff;
  border-radius: 32rpx;
  text-align: center;
}
.empty.small {
  margin-top: 0;
  padding: 40rpx 20rpx;
}
.empty-title {
  font-size: 24rpx;
  font-weight: 800;
  color: #74819A;
}
</style>
