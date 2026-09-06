<template>
  <view class="page">
    <view class="wrap">
      <view class="profile-card">
        <view class="profile-avatar">{{ avatarText }}</view>
        <view class="profile-copy">
          <text class="profile-name">{{ nickname }}</text>
          <text class="profile-account">{{ account }}</text>
        </view>
        <view class="profile-tag">已登录</view>
      </view>

      <view v-if="isAdmin" class="admin-entry" @click="goAdmin">
        <view class="admin-badge">管</view>
        <view class="admin-copy">
          <text class="admin-title">管理员工具</text>
          <text class="admin-sub">查看用户打卡记录 · 重置密码</text>
        </view>
        <text class="admin-arrow">›</text>
      </view>

      <view class="section-head">
        <text class="section-title">修改密码</text>
        <text class="section-sub">修改成功后需重新登录</text>
      </view>

      <view class="pwd-card">
        <view class="pwd-row">
          <text class="pwd-label">旧密码</text>
          <input
            class="pwd-input"
            v-model="oldPassword"
            :password="!showOld"
            placeholder="请输入旧密码"
            placeholder-class="ph"
          />
          <text class="eye" @click="showOld = !showOld">{{ showOld ? '隐藏' : '显示' }}</text>
        </view>
        <view class="pwd-row">
          <text class="pwd-label">新密码</text>
          <input
            class="pwd-input"
            v-model="newPassword"
            :password="!showNew"
            placeholder="至少 8 位字符"
            placeholder-class="ph"
          />
          <text class="eye" @click="showNew = !showNew">{{ showNew ? '隐藏' : '显示' }}</text>
        </view>
        <view class="pwd-row">
          <text class="pwd-label">确认新密码</text>
          <input
            class="pwd-input"
            v-model="confirmPassword"
            :password="!showConfirm"
            placeholder="请再次输入新密码"
            placeholder-class="ph"
          />
          <text class="eye" @click="showConfirm = !showConfirm">{{ showConfirm ? '隐藏' : '显示' }}</text>
        </view>
      </view>

      <text class="form-msg error" v-if="errors.form">{{ errors.form }}</text>
      <text class="form-msg ok" v-if="formOk">{{ formOk }}</text>

      <view class="save-btn" :class="{ disabled: loading }" @click="submit">
        <text>{{ loading ? '正在保存…' : '保存新密码' }}</text>
      </view>

      <view class="logout-card" @click="logout">
        <text>退出登录</text>
      </view>
    </view>
  </view>
</template>

<script>
import { get, post } from '../../utils/request.js'

export default {
  data() {
    return {
      account: '',
      nickname: '朋友',
      avatarText: '友',
      isAdmin: false,
      oldPassword: '',
      newPassword: '',
      confirmPassword: '',
      showOld: false,
      showNew: false,
      showConfirm: false,
      loading: false,
      errors: {},
      formOk: ''
    }
  },
  onLoad() {
    this.setUserInfo()
  },
  onShow() {
    this.setUserInfo()
    this.refreshUser()
  },
  methods: {
    setUserInfo() {
      const user = uni.getStorageSync('eloUser')
      const name = (user && user.nickname) || ''
      this.nickname = name || '朋友'
      this.avatarText = name ? name.charAt(0) : '友'
      this.account = (user && user.account) || ''
      this.isAdmin = Boolean(user && user.isAdmin)
    },
    async refreshUser() {
      try {
        const data = await get('/users/me')
        const user = data.user
        uni.setStorageSync('eloUser', user)
        this.setUserInfo()
      } catch (err) {
        // 请求层已提示；本地缓存信息仍可展示
      }
    },
    goAdmin() {
      uni.navigateTo({ url: '/pages/admin-users/admin-users' })
    },
    validate() {
      const errors = {}
      if (!this.oldPassword) {
        errors.form = '请输入旧密码'
      } else if (!this.newPassword || this.newPassword.length < 8) {
        errors.form = '新密码长度至少为 8 位'
      } else if (this.newPassword === this.oldPassword) {
        errors.form = '新密码不能与旧密码相同'
      } else if (this.confirmPassword !== this.newPassword) {
        errors.form = '两次输入的新密码不一致'
      }
      this.errors = errors
      this.formOk = ''
      return !errors.form
    },
    async submit() {
      if (this.loading) return
      if (!this.validate()) return
      this.loading = true
      try {
        await post('/auth/change-password', {
          oldPassword: this.oldPassword,
          newPassword: this.newPassword
        })
        this.loading = false
        this.formOk = '密码修改成功，正在跳转登录页…'
        // 后端已清除该账号全部会话，本地也一并清理
        uni.removeStorageSync('eloToken')
        uni.removeStorageSync('eloUser')
        uni.showToast({ title: '修改成功，请重新登录', icon: 'none' })
        setTimeout(() => {
          uni.reLaunch({ url: '/pages/login/login' })
        }, 900)
      } catch (err) {
        this.loading = false
      }
    },
    async logout() {
      try {
        // 通知后端销毁当前会话；失败也继续本地清理
        await post('/auth/logout')
      } catch (err) {
        // 忽略接口报错
      }
      uni.removeStorageSync('eloToken')
      uni.removeStorageSync('eloUser')
      uni.reLaunch({ url: '/pages/login/login' })
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
    radial-gradient(460rpx 320rpx at 92% -2%, rgba(16, 185, 129, 0.10), rgba(16, 185, 129, 0) 70%),
    linear-gradient(180deg, #F9FCFA 0%, #F3F8F5 100%);
}
.wrap {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 34rpx 42rpx 30rpx;
}
.profile-card {
  display: flex;
  align-items: center;
  gap: 22rpx;
  background: #fff;
  border: 2rpx solid #E2EFE7;
  border-radius: 36rpx;
  padding: 26rpx;
  box-shadow: 0 18rpx 36rpx -30rpx rgba(20, 65, 46, 0.7);
}
.profile-avatar {
  width: 108rpx;
  height: 108rpx;
  flex-shrink: 0;
  border-radius: 36rpx;
  background: linear-gradient(145deg, #22C55E, #047857);
  color: #fff;
  font-size: 38rpx;
  font-weight: 800;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 16rpx 32rpx -16rpx rgba(16, 150, 90, 0.7);
}
.profile-copy {
  flex: 1;
  min-width: 0;
}
.profile-name {
  display: block;
  font-size: 32rpx;
  font-weight: 800;
  color: #101828;
}
.profile-account {
  display: block;
  font-size: 21rpx;
  color: #8E9AAF;
  margin-top: 5rpx;
  word-break: break-all;
}
.profile-tag {
  flex-shrink: 0;
  font-size: 18rpx;
  font-weight: 800;
  color: #0B7A4E;
  background: #E8F9F0;
  border: 2rpx solid #BCEBCE;
  border-radius: 999rpx;
  padding: 7rpx 16rpx;
}
.admin-entry {
  display: flex;
  align-items: center;
  gap: 20rpx;
  background: #fff;
  border: 2rpx solid #D6EFE1;
  border-radius: 32rpx;
  padding: 22rpx 26rpx;
  margin-top: 22rpx;
  box-shadow: 0 16rpx 32rpx -26rpx rgba(20, 65, 46, 0.65);
}
.admin-badge {
  width: 64rpx;
  height: 64rpx;
  flex-shrink: 0;
  border-radius: 22rpx;
  background: linear-gradient(135deg, #2563EB, #1D4ED8);
  color: #fff;
  font-size: 24rpx;
  font-weight: 800;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 12rpx 24rpx -12rpx rgba(37, 99, 235, 0.75);
}
.admin-copy {
  flex: 1;
  min-width: 0;
}
.admin-title {
  display: block;
  font-size: 27rpx;
  font-weight: 800;
  color: #243042;
}
.admin-sub {
  display: block;
  font-size: 19rpx;
  color: #8E9AAF;
  margin-top: 3rpx;
}
.admin-arrow {
  font-size: 34rpx;
  color: #C0CADA;
  font-weight: 700;
}
.section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 40rpx 6rpx 18rpx;
}
.section-title {
  font-size: 26rpx;
  font-weight: 800;
  color: #243042;
}
.section-sub {
  font-size: 18rpx;
  color: #9AA6BA;
}
.pwd-card {
  background: #fff;
  border: 2rpx solid #E2EFE7;
  border-radius: 36rpx;
  padding: 2rpx 28rpx;
  box-shadow: 0 18rpx 38rpx -32rpx rgba(20, 65, 46, 0.65);
}
.pwd-row {
  display: flex;
  align-items: center;
  gap: 18rpx;
  padding: 24rpx 0;
}
.pwd-row + .pwd-row {
  border-top: 2rpx solid #EEF2F7;
}
.pwd-label {
  flex-shrink: 0;
  width: 150rpx;
  font-size: 23rpx;
  font-weight: 700;
  color: #46506A;
}
.pwd-input {
  flex: 1;
  min-width: 0;
  height: 60rpx;
  font-size: 23rpx;
  color: #172033;
}
.ph {
  color: #B7C0D1;
}
.eye {
  flex-shrink: 0;
  font-size: 22rpx;
  font-weight: 700;
  color: #047857;
  padding: 12rpx 6rpx;
}
.form-msg {
  display: block;
  margin: 18rpx 6rpx 0;
  font-size: 21rpx;
  font-weight: 700;
  line-height: 1.5;
}
.form-msg.error {
  color: #C5484C;
}
.form-msg.ok {
  color: #0B7A4E;
}
.save-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 28rpx;
  height: 104rpx;
  border-radius: 34rpx;
  background: linear-gradient(135deg, #22C55E 0%, #10B981 55%, #047857 100%);
  color: #fff;
  font-size: 30rpx;
  font-weight: 800;
  letter-spacing: 2rpx;
  box-shadow: 0 24rpx 42rpx -18rpx rgba(13, 148, 90, 0.75);
}
.save-btn.disabled {
  opacity: 0.75;
}
.logout-card {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: auto;
  padding: 28rpx;
  background: #FFF7F7;
  border: 2rpx solid #F6D9DA;
  border-radius: 34rpx;
  color: #C5484C;
  font-size: 25rpx;
  font-weight: 800;
  letter-spacing: 2rpx;
}
</style>
