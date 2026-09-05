<template>
  <view class="page">
    <view class="wrap">
      <text class="page-title">当前目标：{{ summaryName }}</text>

      <view class="field-group">
        <text class="label">目标名称</text>
        <input class="field" v-model="goal" placeholder="例如：学习 / 冥想 / 练字" placeholder-class="ph" />
        <text v-if="errors.goal" class="err">{{ errors.goal }}</text>
      </view>

      <view class="field-group">
        <text class="label">具体任务</text>
        <input class="field" v-model="task" placeholder="例如：背 20 个单词" placeholder-class="ph" />
        <text v-if="errors.task" class="err">{{ errors.task }}</text>
      </view>

      <view class="field-group">
        <text class="label">打卡频率</text>
        <view class="segmented">
          <view class="seg" :class="{ sel: freqMode === 'daily' }" @click="freqMode = 'daily'">每天</view>
          <view class="seg" :class="{ sel: freqMode === 'count' }" @click="freqMode = 'count'">每周弹性</view>
          <view class="seg" :class="{ sel: freqMode === 'days' }" @click="freqMode = 'days'">指定周几</view>
        </view>
        <view v-if="freqMode === 'count'" class="week-row">
          <text class="week-desc">一周内任意完成 {{ weeklyCount }} 次即可</text>
          <view class="stepper">
            <view class="step" @click="changeDays(-1)">−</view>
            <text class="days">{{ weeklyCount }} 次</text>
            <view class="step" @click="changeDays(1)">＋</view>
          </view>
        </view>
        <view v-else-if="freqMode === 'days'" class="days-wrap">
          <text class="week-desc">固定在这些星期打卡</text>
          <view class="week-grid">
            <view
              v-for="d in weekOptions"
              :key="d.value"
              class="week-chip"
              :class="{ sel: fixedDays.indexOf(d.value) > -1 }"
              @click="toggleDay(d.value)"
            >
              {{ d.label }}
            </view>
          </view>
          <text class="tip">{{ fixedDays.length ? `每周共 ${fixedDays.length} 天` : '请至少选择一个星期' }}</text>
        </view>
      </view>

      <view class="field-group">
        <text class="label">提醒时间</text>
        <view class="time-picker">
          <view class="t-col">
            <view class="t-arrow" @click="adjustTime('hour', 1)">▲</view>
            <text class="t-value">{{ pad(tpHour) }}</text>
            <text class="t-unit">时</text>
            <view class="t-arrow down" @click="adjustTime('hour', -1)">▼</view>
          </view>
          <text class="t-colon">:</text>
          <view class="t-col">
            <view class="t-arrow" @click="adjustTime('min', 1)">▲</view>
            <text class="t-value">{{ pad(tpMin) }}</text>
            <text class="t-unit">分</text>
            <view class="t-arrow down" @click="adjustTime('min', -1)">▼</view>
          </view>
        </view>
        <text class="tip">分钟可逐分调整，精确到任意时刻</text>
      </view>

      <button class="save" :disabled="loading" @click="save">
        <view v-if="loading" class="spinner"></view>
        <text>{{ loading ? '正在保存…' : '保存修改' }}</text>
      </button>
    </view>
  </view>
</template>

<script>
export default {
  data() {
    return {
      goalId: '',
      goal: '',
      task: '',
      freqMode: 'daily',
      weeklyCount: 3,
      fixedDays: [],
      weekOptions: [
        { label: '一', value: 1 },
        { label: '二', value: 2 },
        { label: '三', value: 3 },
        { label: '四', value: 4 },
        { label: '五', value: 5 },
        { label: '六', value: 6 },
        { label: '日', value: 7 }
      ],
      tpHour: 21,
      tpMin: 30,
      loading: false,
      errors: {}
    }
  },
  computed: {
    summaryName() {
      return this.goal.trim() || '未命名目标'
    },
    timeText() {
      return `${this.pad(this.tpHour)}:${this.pad(this.tpMin)}`
    }
  },
  onLoad(options) {
    this.goalId = (options && options.id) || ''
    this.prefill()
  },
  methods: {
    loadList() {
      const stored = uni.getStorageSync('eloCheckinGoals')
      return Array.isArray(stored) ? stored : []
    },
    prefill() {
      const list = this.loadList()
      const target =
        list.find(g => String(g.id) === String(this.goalId)) || list[0] || null
      if (target) {
        this.goalId = target.id
        this.goal = target.name || ''
        this.task = target.task || ''
        const f = target.freq || { mode: 'daily' }
        if (f.mode === 'count') {
          this.freqMode = 'count'
          this.weeklyCount = Number(f.count || 3)
        } else if (f.mode === 'days') {
          this.freqMode = 'days'
          this.fixedDays = Array.isArray(f.days) ? [...f.days].sort((a, b) => a - b) : []
        } else if (f.daily === false) {
          this.freqMode = 'count'
          this.weeklyCount = Number(f.days || 3)
        } else {
          this.freqMode = 'daily'
        }
        const [h, m] = (target.time || '21:30').split(':').map(Number)
        this.tpHour = Number.isInteger(h) ? h : 21
        this.tpMin = Number.isInteger(m) ? m : 30
      }
    },
    pad(n) {
      return String(n).padStart(2, '0')
    },
    adjustTime(part, delta) {
      if (part === 'hour') {
        this.tpHour = (this.tpHour + delta + 24) % 24
      } else {
        this.tpMin = (this.tpMin + delta + 60) % 60
      }
    },
    changeDays(delta) {
      this.weeklyCount = Math.min(7, Math.max(1, this.weeklyCount + delta))
    },
    toggleDay(value) {
      const i = this.fixedDays.indexOf(value)
      if (i > -1) this.fixedDays.splice(i, 1)
      else this.fixedDays.push(value)
    },
    validate() {
      const errors = {}
      if (!this.goal.trim()) errors.goal = '请填写目标名称'
      if (!this.task.trim()) errors.task = '请填写一项具体任务'
      this.errors = errors
      if (!errors.goal && !errors.task && this.freqMode === 'days' && !this.fixedDays.length) {
        this.errors.freq = '请至少选择一个星期'
      }
      return !errors.goal && !errors.task && !this.errors.freq
    },
    save() {
      if (this.loading) return
      if (!this.validate()) return
      this.loading = true
      setTimeout(() => {
        const list = this.loadList()
        if (!this.goalId) this.goalId = `goal_${Date.now()}`
        const idx = list.findIndex(g => String(g.id) === String(this.goalId))
        const updated = {
          id: this.goalId,
          name: this.goal.trim(),
          task: this.task.trim(),
          freq:
            this.freqMode === 'daily'
              ? { mode: 'daily' }
              : this.freqMode === 'count'
                ? { mode: 'count', count: this.weeklyCount }
                : { mode: 'days', days: [...this.fixedDays].sort((a, b) => a - b) },
          time: this.timeText
        }
        if (idx > -1) list.splice(idx, 1, updated)
        else list.push(updated)
        uni.setStorageSync('eloCheckinGoals', list)
        this.loading = false
        uni.showToast({ title: '修改已生效', icon: 'success' })
        setTimeout(() => {
          uni.reLaunch({ url: '/pages/checkin/checkin' })
        }, 800)
      }, 1200)
    }
  }
}
</script>

<style scoped>
.page {
  min-height: 100vh;
  background:
    radial-gradient(420rpx 300rpx at 92% -2%, rgba(16, 185, 129, 0.10), rgba(16, 185, 129, 0) 70%),
    linear-gradient(180deg, #F9FCFA 0%, #F3F8F5 100%);
}
.wrap {
  padding: 44rpx 46rpx 50rpx;
}
.page-title {
  display: block;
  font-size: 22rpx;
  font-weight: 600;
  color: #A0AABE;
  margin-bottom: 36rpx;
}
.field-group {
  margin-bottom: 32rpx;
}
.label {
  display: block;
  font-size: 24rpx;
  font-weight: 800;
  color: #8A95AA;
  margin-bottom: 14rpx;
}
.field {
  width: 100%;
  height: 96rpx;
  padding: 0 26rpx;
  background: #fff;
  border: 3rpx solid #E3EDE7;
  border-radius: 30rpx;
  font-size: 29rpx;
  color: #172033;
}
.ph {
  color: #ABB4C8;
}
.err {
  display: block;
  margin-top: 10rpx;
  font-size: 21rpx;
  color: #E5484D;
}
.segmented {
  display: flex;
  background: #EAF0EA;
  border-radius: 30rpx;
  padding: 6rpx;
}
.seg {
  flex: 1;
  text-align: center;
  font-size: 25rpx;
  font-weight: 700;
  color: #75806F;
  border-radius: 24rpx;
  padding: 20rpx 0;
}
.seg.sel {
  background: #fff;
  color: #0B9D60;
  box-shadow: 0 8rpx 20rpx -10rpx rgba(30, 70, 45, 0.5);
}
.week-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 18rpx;
}
.days-wrap {
  margin-top: 18rpx;
}
.week-grid {
  display: flex;
  justify-content: space-between;
  gap: 10rpx;
  margin-top: 14rpx;
}
.week-chip {
  flex: 1;
  text-align: center;
  font-size: 22rpx;
  font-weight: 800;
  color: #75806F;
  background: #fff;
  border: 2rpx solid #D9E3DC;
  border-radius: 20rpx;
  padding: 18rpx 0;
}
.week-chip.sel {
  color: #fff;
  background: linear-gradient(135deg, #22C55E, #0BA360);
  border-color: transparent;
  box-shadow: 0 10rpx 18rpx -10rpx rgba(13, 148, 90, 0.7);
}
.week-desc {
  font-size: 20rpx;
  color: #8A95AA;
}
.stepper {
  display: flex;
  align-items: center;
  gap: 14rpx;
}
.step {
  width: 52rpx;
  height: 52rpx;
  border-radius: 18rpx;
  border: 2rpx solid #C9D6E8;
  background: #fff;
  color: #4B5670;
  font-size: 30rpx;
  font-weight: 800;
  display: flex;
  align-items: center;
  justify-content: center;
}
.days {
  font-size: 24rpx;
  font-weight: 800;
  color: #1B2438;
  min-width: 86rpx;
  text-align: center;
}
.time-picker {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 36rpx;
  background: #fff;
  border: 3rpx solid #DCEFE5;
  border-radius: 30rpx;
  padding: 18rpx 20rpx;
  box-shadow: 0 18rpx 36rpx -30rpx rgba(20, 65, 46, 0.6);
}
.t-col {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6rpx;
  min-width: 106rpx;
}
.t-arrow {
  width: 58rpx;
  height: 44rpx;
  border-radius: 18rpx;
  background: #E8F9F0;
  color: #0B9D60;
  font-size: 22rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.t-value {
  font-size: 56rpx;
  font-weight: 800;
  color: #1B2438;
  letter-spacing: 2rpx;
  line-height: 1.2;
}
.t-unit {
  font-size: 17rpx;
  font-weight: 800;
  color: #A6B0C4;
  letter-spacing: 4rpx;
}
.t-colon {
  font-size: 48rpx;
  font-weight: 800;
  color: #C2CDDC;
  margin-top: -16rpx;
}
.tip {
  display: block;
  margin-top: 10rpx;
  font-size: 19rpx;
  color: #A2ADC0;
}
.save {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 14rpx;
  margin-top: 34rpx;
  width: 100%;
  height: 104rpx;
  border-radius: 34rpx;
  font-size: 31rpx;
  font-weight: 800;
  color: #fff;
  background: linear-gradient(135deg, #22C55E, #10B981 55%, #047857);
  box-shadow: 0 24rpx 40rpx -18rpx rgba(13, 148, 90, 0.75);
}
.save::after {
  border: 0;
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
</style>
