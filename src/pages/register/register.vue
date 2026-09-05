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
        <text class="hello-title">创建账号</text>
        <text class="hello-sub">注册 elo 账号，只需填写账号与密码</text>
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
              placeholder="设置密码（至少 8 位）"
              placeholder-class="ph"
            />
            <text class="eye" @click="showPwd = !showPwd">{{ showPwd ? '隐藏' : '显示' }}</text>
          </view>
          <text v-if="errors.password" class="err">{{ errors.password }}</text>
        </view>

        <button class="btn primary" :disabled="loading" @click="register">
          <view v-if="loading" class="spinner"></view>
          <text>{{ loading ? '正在注册…' : '注 册' }}</text>
        </button>

        <view class="switch-line">
          <text class="muted">已有账号？</text>
          <text class="link" @click="goLogin">直接登录</text>
        </view>

        <text class="agreement" @click="tip('原型示意：打开《服务协议》与《隐私政策》')">
          注册即代表同意《服务协议》与《隐私政策》
        </text>
      </view>
    </view>
  </view>
</template>

<script>
import { post } from '../../utils/request.js'

export default {
  data() {
    return {
      account: '',
      password: '',
      showPwd: false,
      loading: false,
      errors: {}
    }
  },
  methods: {
    tip(text) {
      uni.showToast({ title: text, icon: 'none' })
    },
    goLogin() {
      uni.reLaunch({ url: '/pages/login/login' })
    },
    validate() {
      const errors = {}
      const acc = this.account.trim()
      if (!acc) {
        errors.account = '请输入账号'
      } else if (acc.length < 3) {
        errors.account = '账号长度不能少于 3 位'
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
    async register() {
      if (this.loading) return
      if (!this.validate()) return
      this.loading = true
      try {
        await post('/auth/register', {
          account: this.account.trim(),
          password: this.password
        })
        this.loading = false
        uni.setStorageSync('eloAccount', this.account.trim())
        uni.showToast({ title: '注册成功，请登录', icon: 'success' })
        setTimeout(() => {
          uni.reLaunch({ url: '/pages/login/login' })
        }, 800)
      } catch (err) {
        this.loading = false
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
  padding: 90rpx 56rpx 40rpx;
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
  margin-top: 56rpx;
}
.hello-title {
  display: block;
  font-size: 56rpx;
  font-weight: 800;
  color: #101828;
}
.hello-sub {
  display: block;
  margin-top: 14rpx;
  font-size: 26rpx;
  color: #68738C;
}
.form {
  margin-top: 54rpx;
}
.field-group {
  margin-bottom: 28rpx;
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
.btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 14rpx;
  margin-top: 30rpx;
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
  margin-top: 30rpx;
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
  margin-top: 40rpx;
  font-size: 21rpx;
  color: #98A3B8;
}
</style>
