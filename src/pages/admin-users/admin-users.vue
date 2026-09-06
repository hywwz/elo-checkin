<template>
  <view class="page">
    <view class="wrap">
      <view class="head-copy">
        <text class="head-title">用户列表</text>
        <text class="head-sub">共 {{ users.length }} 个账号，点击查看打卡记录</text>
      </view>

      <view v-if="loading" class="empty">
        <text class="empty-title">正在加载…</text>
      </view>

      <view v-else-if="!users.length" class="empty">
        <text class="empty-title">暂无用户</text>
      </view>

      <view v-else class="user-list">
        <view
          v-for="u in users"
          :key="u.id"
          class="user-card"
          @click="openUser(u)"
        >
          <view class="avatar">{{ avatarText(u) }}</view>
          <view class="user-copy">
            <view class="name-row">
              <text class="name">{{ u.nickname }}</text>
              <text v-if="isAdminAccount(u)" class="admin-tag">管理员</text>
            </view>
            <text class="account">{{ u.account }}</text>
            <text class="meta">
              目标 {{ u.goalCount }} · 打卡 {{ u.checkinCount }} 次
              <template v-if="u.lastDate"> · 最近 {{ u.lastDate }}</template>
            </text>
          </view>
          <text class="arrow">›</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import { get } from '../../utils/request.js'

export default {
  data() {
    return {
      users: [],
      adminAccounts: [],
      loading: true
    }
  },
  onShow() {
    this.fetchUsers()
  },
  methods: {
    avatarText(u) {
      return (u.nickname || u.account || '?').charAt(0)
    },
    isAdminAccount(u) {
      return this.adminAccounts.includes(u.account)
    },
    async fetchUsers() {
      this.loading = true
      try {
        const data = await get('/admin/users')
        this.users = data.users || []
        this.adminAccounts = []
        const me = uni.getStorageSync('eloUser')
        if (me && me.account && me.isAdmin) {
          this.adminAccounts.push(me.account)
        }
      } catch (err) {
        // 请求层已提示
      } finally {
        this.loading = false
      }
    },
    openUser(u) {
      uni.navigateTo({
        url: `/pages/admin-user/admin-user?id=${encodeURIComponent(u.id)}&account=${encodeURIComponent(u.account)}&nickname=${encodeURIComponent(u.nickname)}`
      })
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
  padding: 34rpx 42rpx 40rpx;
}
.head-copy {
  margin-bottom: 24rpx;
}
.head-title {
  display: block;
  font-size: 40rpx;
  font-weight: 800;
  color: #101828;
}
.head-sub {
  display: block;
  font-size: 22rpx;
  color: #74819A;
  margin-top: 8rpx;
}
.user-list {
  display: flex;
  flex-direction: column;
  gap: 18rpx;
}
.user-card {
  display: flex;
  align-items: center;
  gap: 20rpx;
  background: #fff;
  border: 2rpx solid #E2EFE7;
  border-radius: 32rpx;
  padding: 22rpx 24rpx;
  box-shadow: 0 16rpx 32rpx -28rpx rgba(20, 65, 46, 0.65);
}
.avatar {
  width: 76rpx;
  height: 76rpx;
  flex-shrink: 0;
  border-radius: 26rpx;
  background: linear-gradient(145deg, #22C55E, #047857);
  color: #fff;
  font-size: 28rpx;
  font-weight: 800;
  display: flex;
  align-items: center;
  justify-content: center;
}
.user-copy {
  flex: 1;
  min-width: 0;
}
.name-row {
  display: flex;
  align-items: center;
  gap: 10rpx;
}
.name {
  font-size: 28rpx;
  font-weight: 800;
  color: #243042;
}
.admin-tag {
  font-size: 16rpx;
  font-weight: 800;
  color: #1D4ED8;
  background: #E8EEFF;
  border-radius: 999rpx;
  padding: 4rpx 12rpx;
}
.account {
  display: block;
  font-size: 21rpx;
  color: #8E9AAF;
  margin-top: 4rpx;
  word-break: break-all;
}
.meta {
  display: block;
  font-size: 19rpx;
  color: #0B7A4E;
  margin-top: 8rpx;
}
.arrow {
  font-size: 38rpx;
  color: #C0CADA;
  font-weight: 700;
}
.empty {
  margin-top: 80rpx;
  padding: 80rpx 20rpx;
  background: #fff;
  border-radius: 32rpx;
  text-align: center;
}
.empty-title {
  font-size: 26rpx;
  font-weight: 800;
  color: #74819A;
}
</style>
