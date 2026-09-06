<template>
  <view class="page">
    <view class="wrap">
      <view class="brand-row">
        <view class="brand-mark">e</view>
        <view class="brand-text">
          <text class="brand-name">elo</text>
          <text class="brand-sub">Workplace</text>
        </view>
      </view>

      <view class="hello">
        <text class="hello-title">欢迎回来</text>
        <text class="hello-sub">登录 elo 账号，继续你的高效工作</text>
      </view>

      <view class="form">
        <view class="field-group">
          <text class="label">账号<text class="star">*</text></text>
          <input
            class="field"
            v-model="account"
            type="text"
            placeholder="邮箱 / 手机号"
            placeholder-class="ph"
          />
          <text v-if="errors.account" class="err">{{ errors.account }}</text>
        </view>

        <view class="field-group">
          <text class="label">密码<text class="star">*</text></text>
          <view class="pwd-wrap">
            <input
              class="field no-border"
              v-model="password"
              :password="!showPwd"
              placeholder="至少 8 位字符"
              placeholder-class="ph"
            />
            <text class="eye" @click="showPwd = !showPwd">{{ showPwd ? '隐藏' : '显示' }}</text>
          </view>
          <text v-if="errors.password" class="err">{{ errors.password }}</text>
        </view>

        <view class="row-between">
          <view class="remember" @click="rememberPwd = !rememberPwd">
            <view class="checkbox" :class="{ checked: rememberPwd }">
              <text v-if="rememberPwd" class="tick">✓</text>
            </view>
            <text class="remember-label">记住密码</text>
          </view>
          <text class="forgot" @click="contactAdmin">忘记密码？</text>
        </view>

        <button class="btn primary" :disabled="loading" @click="login">
          <view v-if="loading" class="spinner"></view>
          <text>{{ loading ? '正在登录…' : '登 录' }}</text>
        </button>

        <view class="switch-line">
          <text class="muted">还没有账号？</text>
          <text class="link" @click="goRegister">立即注册</text>
        </view>

        <text class="agreement" @click="tip('原型示意：打开《服务协议》与《隐私政策》')">
          登录即代表同意《服务协议》与《隐私政策》
        </text>
      </view>
    </view>
  </view>
</template>

<script>
import CryptoJS from 'crypto-js'
import { post } from '../../utils/request.js'

// 仅用于本地“记住密码”的对称加密密钥（防明文拖库，不用于服务端校验）
const REMEMBER_SECRET = 'elo-checkin-local-remember-v1'
const SAVED_PASSWORD_KEY = 'eloSavedPassword'

export default {
  data() {
    return {
      account: '',
      password: '',
      showPwd: false,
      rememberPwd: false,
      loading: false,
      errors: {}
    }
  },
  onLoad() {
    this.account = uni.getStorageSync('eloAccount') || ''
    const remembered = uni.getStorageSync('eloRememberPwd')
    this.rememberPwd = remembered === true || remembered === 'true'
    if (this.rememberPwd) {
      const encrypted = uni.getStorageSync(SAVED_PASSWORD_KEY)
      if (encrypted) {
        try {
          const bytes = CryptoJS.AES.decrypt(encrypted, REMEMBER_SECRET)
          this.password = bytes.toString(CryptoJS.enc.Utf8)
        } catch (err) {
          this.password = ''
        }
      }
    }
  },
  methods: {
    tip(text) {
      uni.showToast({ title: text, icon: 'none' })
    },
    contactAdmin() {
      uni.showModal({
        title: '忘记密码',
        content: '当前为体验版，暂不支持自助找回。请联系管理员「陈晨」协助重置密码。',
        showCancel: false,
        confirmText: '知道了'
      })
    },
    goRegister() {
      uni.navigateTo({ url: '/pages/register/register' })
    },
    validate() {
      const errors = {}
      const acc = this.account.trim()
      if (!acc) {
        errors.account = '请输入账号'
      } else if (acc.includes('@') && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(acc)) {
        errors.account = '邮箱格式不正确，请检查'
      }
      if (!this.password) {
        errors.password = '请输入密码'
      } else if (this.password.length < 8) {
        errors.password = '密码长度至少为 8 位'
      }
      this.errors = errors
      return !errors.account && !errors.password
    },
    async login() {
      if (this.loading) return
      if (!this.validate()) return
      this.loading = true
      try {
        const data = await post('/auth/login', {
          account: this.account.trim(),
          password: this.password
        })
        uni.setStorageSync('eloToken', data.token)
        uni.setStorageSync('eloUser', data.user)
        uni.setStorageSync('eloAccount', this.account.trim())
        this.saveRememberedPassword()
        this.loading = false
        uni.showToast({ title: '登录成功', icon: 'success' })
        setTimeout(() => {
          uni.reLaunch({ url: '/pages/checkin/checkin' })
        }, 800)
      } catch (err) {
        this.loading = false
      }
    },
    saveRememberedPassword() {
      try {
        if (this.rememberPwd) {
          uni.setStorageSync('eloRememberPwd', true)
          uni.setStorageSync(
            SAVED_PASSWORD_KEY,
            CryptoJS.AES.encrypt(this.password, REMEMBER_SECRET).toString()
          )
        } else {
          uni.setStorageSync('eloRememberPwd', false)
          uni.removeStorageSync(SAVED_PASSWORD_KEY)
        }
      } catch (err) {
        // 本地加密存储失败时静默降级，本次不记住密码
      }
    }
  }
}
</script>

<style scoped>
.page {
  min-height: 100vh;
  background:
    radial-gradient(420rpx 300rpx at 90% 0%, rgba(16, 185, 129, 0.10), rgba(16, 185, 129, 0) 70%),
    linear-gradient(180deg, #F9FCFA 0%, #F3F8F5 100%);
}
.wrap {
  padding: 100rpx 56rpx 40rpx;
}
.brand-row {
  display: flex;
  align-items: center;
  gap: 18rpx;
}
.brand-mark {
  width: 72rpx;
  height: 72rpx;
  border-radius: 24rpx;
  background: linear-gradient(135deg, #22C55E, #0BA360);
  color: #fff;
  font-size: 40rpx;
  font-weight: 800;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 16rpx 30rpx -12rpx rgba(10, 150, 90, 0.7);
}
.brand-name {
  display: block;
  font-size: 36rpx;
  font-weight: 800;
  color: #171C28;
  line-height: 1.2;
}
.brand-sub {
  display: block;
  font-size: 18rpx;
  font-weight: 700;
  color: #9BA6BC;
  letter-spacing: 4rpx;
}
.hello {
  margin-top: 64rpx;
}
.hello-title {
  display: block;
  font-size: 60rpx;
  font-weight: 800;
  color: #101828;
}
.hello-sub {
  display: block;
  margin-top: 16rpx;
  font-size: 26rpx;
  color: #68738C;
  line-height: 1.6;
}
.form {
  margin-top: 64rpx;
}
.field-group {
  margin-bottom: 30rpx;
}
.label {
  display: block;
  margin: 0 0 14rpx 6rpx;
  font-size: 24rpx;
  font-weight: 700;
  color: #3D465C;
}
.star {
  color: #C03A3F;
  margin-left: 4rpx;
}
.field {
  width: 100%;
  height: 104rpx;
  padding: 0 28rpx;
  background: #fff;
  border: 3rpx solid #E4E8F1;
  border-radius: 30rpx;
  font-size: 28rpx;
  color: #172033;
}
.no-border {
  border: 0;
  background: transparent;
  height: 100rpx;
}
.ph {
  color: #ABB4C8;
}
.pwd-wrap {
  display: flex;
  align-items: center;
  background: #fff;
  border: 3rpx solid #E4E8F1;
  border-radius: 30rpx;
  padding-right: 20rpx;
}
.pwd-wrap .field {
  flex: 1;
}
.eye {
  flex-shrink: 0;
  font-size: 24rpx;
  color: #98A3BA;
  padding: 20rpx 10rpx;
}
.err {
  display: block;
  margin: 10rpx 4rpx 0;
  font-size: 22rpx;
  color: #E5484D;
}
.row-between {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 26rpx;
}
.remember {
  display: flex;
  align-items: center;
  gap: 10rpx;
  padding: 10rpx;
}
.checkbox {
  width: 34rpx;
  height: 34rpx;
  border-radius: 10rpx;
  border: 3rpx solid #C4CEDF;
  background: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}
.checkbox.checked {
  background: linear-gradient(135deg, #22C55E, #0BA360);
  border-color: transparent;
}
.tick {
  color: #fff;
  font-size: 22rpx;
  font-weight: 800;
  line-height: 1;
}
.remember-label {
  font-size: 24rpx;
  font-weight: 600;
  color: #4A5568;
}
.forgot {
  font-size: 24rpx;
  font-weight: 700;
  color: #047857;
  padding: 10rpx;
}
.btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 14rpx;
  width: 100%;
  height: 108rpx;
  border-radius: 34rpx;
  font-size: 31rpx;
  font-weight: 800;
  letter-spacing: 2rpx;
}
.btn::after {
  border: 0;
}
.btn.primary {
  background: linear-gradient(135deg, #22C55E 0%, #10B981 55%, #047857 100%);
  color: #fff;
  box-shadow: 0 24rpx 42rpx -18rpx rgba(13, 148, 90, 0.75);
}
.spinner {
  width: 30rpx;
  height: 30rpx;
  border-radius: 50%;
  border: 4rpx solid rgba(255, 255, 255, 0.35);
  border-top-color: #fff;
  animation: btn-spin 0.7s linear infinite;
}
@keyframes btn-spin {
  to { transform: rotate(360deg); }
}
.switch-line {
  margin-top: 36rpx;
  display: flex;
  justify-content: center;
  font-size: 24rpx;
}
.muted {
  color: #7C879E;
}
.link {
  color: #047857;
  font-weight: 700;
  margin-left: 6rpx;
}
.agreement {
  display: block;
  text-align: center;
  margin-top: 42rpx;
  font-size: 21rpx;
  color: #98A3B8;
}
</style>
