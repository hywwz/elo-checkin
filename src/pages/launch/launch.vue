<template>
  <view class="page">
    <view class="launch-box">
      <view class="logo">e</view>
      <text class="brand-name">elo</text>
      <text class="brand-sub">WORKPLACE</text>

      <view v-if="checking && !errorMsg" class="loader"></view>

      <view v-else-if="errorMsg" class="error-box">
        <text class="error-text">{{ errorMsg }}</text>
        <view class="retry-btn" @click="enterApp">重新连接</view>
      </view>
    </view>
  </view>
</template>

<script>
import { get } from '../../utils/request.js'

export default {
  data() {
    return {
      checking: true,
      errorMsg: ''
    }
  },
  onLoad() {
    this.enterApp()
  },
  methods: {
    async enterApp() {
      this.checking = true
      this.errorMsg = ''

      const token = uni.getStorageSync('eloToken')
      if (!token) {
        this.goLogin()
        return
      }

      try {
        const data = await get('/users/me', { silent: true })
        if (data && data.user) {
          uni.setStorageSync('eloUser', data.user)
        }
        uni.reLaunch({ url: '/pages/checkin/checkin' })
      } catch (err) {
        if (err.code) {
          uni.showToast({
            title: err.message || '登录已失效，请重新登录',
            icon: 'none'
          })
          setTimeout(() => {
            this.goLogin()
          }, 600)
        } else {
          this.checking = false
          this.errorMsg = err.message || '无法连接服务器，请稍后重试'
        }
      }
    },
    goLogin() {
      uni.reLaunch({ url: '/pages/login/login' })
    }
  }
}
</script>

<style scoped>
.page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background:
    radial-gradient(420rpx 300rpx at 90% 0%, rgba(16, 185, 129, 0.10), rgba(16, 185, 129, 0) 70%),
    linear-gradient(180deg, #F9FCFA 0%, #F3F8F5 100%);
}
.launch-box {
  display: flex;
  flex-direction: column;
  align-items: center;
}
.logo {
  width: 152rpx;
  height: 152rpx;
  border-radius: 48rpx;
  background: linear-gradient(135deg, #22C55E, #0BA360);
  color: #fff;
  font-size: 84rpx;
  font-weight: 800;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 28rpx 52rpx -20rpx rgba(13, 148, 90, 0.8);
}
.brand-name {
  display: block;
  font-size: 52rpx;
  font-weight: 800;
  color: #171C28;
  margin-top: 28rpx;
}
.brand-sub {
  display: block;
  font-size: 22rpx;
  font-weight: 700;
  color: #9BA6BC;
  letter-spacing: 8rpx;
  margin-top: 8rpx;
}
.loader {
  width: 56rpx;
  height: 56rpx;
  border-radius: 50%;
  border: 6rpx solid #D9F0E3;
  border-top-color: #0B9D60;
  margin-top: 68rpx;
  animation: launch-spin 0.8s linear infinite;
}
@keyframes launch-spin {
  to { transform: rotate(360deg); }
}
.error-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-top: 68rpx;
}
.error-text {
  display: block;
  font-size: 26rpx;
  color: #7C879E;
}
.retry-btn {
  margin-top: 28rpx;
  padding: 20rpx 56rpx;
  border-radius: 999rpx;
  background: linear-gradient(135deg, #22C55E, #0BA360);
  color: #fff;
  font-size: 26rpx;
  font-weight: 800;
  box-shadow: 0 18rpx 30rpx -16rpx rgba(13, 148, 90, 0.75);
}
</style>
