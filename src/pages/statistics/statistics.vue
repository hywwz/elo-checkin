<template>
  <view class="page">
    <view class="wrap">
      <view class="period-row">
        <view class="seg" :class="{ sel: period === 'current' }" @click="switchPeriod('current')">本月</view>
        <view class="seg" :class="{ sel: period === 'last' }" @click="switchPeriod('last')">上月</view>
        <view class="seg" :class="{ sel: period === 'year' }" @click="switchPeriod('year')">今年</view>
      </view>

      <view class="rate-card">
        <view class="rate-head">
          <text class="rate-label">{{ data.periodLabel }}</text>
          <view class="delta" :class="{ down: data.delta.indexOf('-') > -1 }">
            <text class="arrow">{{ data.delta.indexOf('-') > -1 ? '↓' : '↑' }}</text>
            <text>{{ data.delta }}</text>
          </view>
        </view>
        <view class="rate-body">
          <view class="rate-num">
            <text class="num">{{ data.rate }}</text>
            <text class="pct">%</text>
          </view>
          <view class="rate-copy">
            <text class="r-title">{{ data.title }}</text>
            <text class="r-desc">{{ data.desc }}</text>
            <view class="bar">
              <view class="fill" :style="{ width: data.rate + '%' }"></view>
            </view>
          </view>
        </view>
      </view>

      <view class="mini-row">
        <view class="mini">
          <text class="m-icon">✦</text>
          <view>
            <text class="m-num">{{ data.totals.value }}{{ data.totals.unit }}</text>
            <text class="m-label">{{ data.totals.label }}</text>
          </view>
        </view>
        <view class="mini">
          <text class="m-icon streak">◈</text>
          <view>
            <text class="m-num">{{ data.streak.value }}{{ data.streak.unit }}</text>
            <text class="m-label">{{ data.streak.label }}</text>
          </view>
        </view>
      </view>

      <view class="card">
        <view class="card-head">
          <text class="card-title">{{ data.trend.title }}</text>
          <text class="card-note">{{ data.trend.caption }}</text>
        </view>
        <view class="trend">
          <view class="b-col" v-for="(item, i) in data.trend.items" :key="i">
            <text class="b-val">{{ item.value }}</text>
            <view class="b-bar" :style="{ height: Math.max(4, Math.round((item.value / data.trend.max) * 100)) + '%' }"></view>
            <text class="b-day">{{ item.label }}</text>
          </view>
        </view>
      </view>

      <view class="card goals-card">
        <view class="card-head">
          <text class="card-title">目标完成</text>
          <text class="card-note">次数 / 目标</text>
        </view>
        <view class="goal-row" v-for="g in data.goals" :key="g.id || g.name">
          <view class="g-head">
            <text class="g-name">{{ g.name }}</text>
            <text class="g-count"><text class="strong">{{ g.completed }}</text> / {{ g.target }} 次</text>
          </view>
          <view class="track">
            <view class="fill" :style="{ width: g.target ? Math.round((g.completed / g.target) * 100) + '%' : '0%' }"></view>
          </view>
        </view>
      </view>

      <text class="foot-note">记录只属于你自己，进步都在数据里</text>
    </view>
  </view>
</template>

<script>
import { get } from '../../utils/request.js'

const DATA = {
  current: {
    period: '本月打卡率',
    delta: '较上月 +8%',
    rate: 86,
    title: '本月已打卡 26 天',
    desc: '目标 30 次 · 剩余 4 次，继续保持节奏',
    totals: '63 天',
    totalLabel: '累计坚持',
    streak: '12 天',
    streakLabel: '最长连续',
    trendTitle: '最近 7 天',
    trendCaption: '柱高 = 当天完成任务数',
    barMax: 5,
    bars: [2, 3, 3, 4, 5, 3, 2],
    labels: ['六', '日', '一', '二', '三', '四', '五'],
    goals: [
      ['学习', 24, 30],
      ['冥想', 15, 20],
      ['早睡', 21, 30]
    ]
  },
  last: {
    period: '上月打卡率',
    delta: '较上月 -8%',
    rate: 78,
    title: '上月已打卡 23 天',
    desc: '目标 31 次 · 完成率 78%，本月继续加油',
    totals: '63 天',
    totalLabel: '累计坚持',
    streak: '12 天',
    streakLabel: '最长连续',
    trendTitle: '最近 7 天',
    trendCaption: '柱高 = 当天完成任务数',
    barMax: 5,
    bars: [1, 2, 2, 3, 3, 2, 1],
    labels: ['六', '日', '一', '二', '三', '四', '五'],
    goals: [
      ['学习', 22, 30],
      ['冥想', 12, 20],
      ['早睡', 18, 30]
    ]
  },
  year: {
    period: '年度打卡率',
    delta: '较去年 +5%',
    rate: 82,
    title: '今年已打卡 236 天',
    desc: '目标 288 次 · 剩余 52 次，按自己的节奏走',
    totals: '236 天',
    totalLabel: '今年坚持',
    streak: '45 天',
    streakLabel: '年度最长',
    trendTitle: '年度趋势',
    trendCaption: '柱高 = 当月打卡天数',
    barMax: 30,
    bars: [18, 20, 21, 23, 20, 22, 19, 21, 18, 19, 17, 18],
    labels: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'],
    goals: [
      ['学习', 236, 288],
      ['冥想', 150, 240],
      ['早睡', 190, 288]
    ]
  }
}

const EMPTY_STATS = {
  periodLabel: '',
  delta: '',
  rate: 0,
  title: '',
  desc: '',
  totals: { value: 0, unit: '天', label: '累计坚持' },
  streak: { value: 0, unit: '天', label: '最长连续' },
  trend: { title: '', caption: '', max: 1, items: [] },
  goals: []
}

export default {
  data() {
    return {
      period: 'current',
      data: EMPTY_STATS
    }
  },
  onLoad() {
    this.fetchStats()
  },
  methods: {
    switchPeriod(key) {
      this.period = key
      this.fetchStats()
    },
    async fetchStats() {
      try {
        const periodMap = {
          current: 'this_month',
          last: 'last_month',
          year: 'this_year'
        }
        const data = await get(`/statistics?period=${periodMap[this.period]}`)
        this.data = data
      } catch (err) {
        // 请求层已提示
      }
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
.period-row {
  display: flex;
  justify-content: flex-end;
  gap: 14rpx;
}
.seg {
  font-size: 22rpx;
  font-weight: 700;
  color: #75806F;
  background: #EAF0EA;
  border-radius: 24rpx;
  padding: 14rpx 26rpx;
}
.seg.sel {
  background: #fff;
  color: #0B9D60;
  box-shadow: 0 10rpx 20rpx -12rpx rgba(30, 70, 45, 0.5);
}
.rate-card {
  position: relative;
  margin-top: 28rpx;
  background:
    radial-gradient(240rpx 180rpx at 94% -8%, rgba(255, 255, 255, 0.22), rgba(255, 255, 255, 0) 70%),
    linear-gradient(150deg, #14B96C, #0BA360 55%, #047857);
  border-radius: 48rpx;
  padding: 34rpx;
  color: #fff;
  box-shadow: 0 34rpx 60rpx -30rpx rgba(4, 120, 87, 0.65);
}
.rate-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.rate-label {
  font-size: 22rpx;
  font-weight: 800;
  letter-spacing: 3rpx;
}
.delta {
  display: flex;
  align-items: center;
  font-size: 19rpx;
  font-weight: 800;
  color: #0B7A4E;
  background: #fff;
  border-radius: 999rpx;
  padding: 8rpx 16rpx;
}
.delta.down .arrow {
  color: #E8852B;
}
.arrow {
  color: #22C55E;
  margin-right: 6rpx;
}
.rate-body {
  display: flex;
  align-items: center;
  gap: 34rpx;
  margin-top: 24rpx;
}
.rate-num {
  flex-shrink: 0;
}
.num {
  font-size: 92rpx;
  font-weight: 800;
  line-height: 1;
}
.pct {
  font-size: 30rpx;
  font-weight: 800;
  color: rgba(255, 255, 255, 0.85);
}
.rate-copy {
  flex: 1;
  min-width: 0;
}
.r-title {
  display: block;
  font-size: 27rpx;
  font-weight: 800;
}
.r-desc {
  display: block;
  margin-top: 6rpx;
  font-size: 20rpx;
  color: rgba(255, 255, 255, 0.8);
  line-height: 1.5;
}
.bar {
  height: 8rpx;
  border-radius: 99rpx;
  background: rgba(255, 255, 255, 0.22);
  margin-top: 18rpx;
  overflow: hidden;
}
.fill {
  height: 100%;
  border-radius: 99rpx;
  background: #fff;
}
.mini-row {
  display: flex;
  gap: 20rpx;
  margin-top: 24rpx;
}
.mini {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 18rpx;
  background: #fff;
  border: 2rpx solid #E2EFE7;
  border-radius: 32rpx;
  padding: 22rpx;
}
.m-icon {
  width: 70rpx;
  height: 70rpx;
  border-radius: 24rpx;
  background: #E8F9F0;
  color: #0B9D60;
  font-size: 32rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.m-icon.streak {
  background: #FFF5E8;
  color: #E8852B;
}
.m-num {
  display: block;
  font-size: 34rpx;
  font-weight: 800;
  line-height: 1.2;
}
.m-label {
  display: block;
  font-size: 18rpx;
  color: #96A1B8;
  margin-top: 2rpx;
}
.card {
  margin-top: 24rpx;
  background: #fff;
  border: 2rpx solid #E2EFE7;
  border-radius: 40rpx;
  padding: 26rpx;
}
.card-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
}
.card-title {
  font-size: 25rpx;
  font-weight: 800;
  color: #243042;
}
.card-note {
  font-size: 17rpx;
  color: #A2ADC0;
}
.trend {
  display: flex;
  align-items: flex-end;
  gap: 10rpx;
  height: 150rpx;
  margin-top: 18rpx;
}
.b-col {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-end;
  height: 100%;
  gap: 8rpx;
}
.b-val {
  font-size: 16rpx;
  color: #9AA6BA;
  font-weight: 700;
  height: 18rpx;
}
.b-bar {
  width: 100%;
  max-width: 30rpx;
  min-height: 6rpx;
  border-radius: 10rpx;
  background: linear-gradient(180deg, #34D399, #0BA360);
}
.b-day {
  font-size: 17rpx;
  color: #8E99AE;
  font-weight: 700;
}
.goals-card {
  margin-top: 24rpx;
}
.goal-row {
  margin-top: 22rpx;
}
.g-head {
  display: flex;
  justify-content: space-between;
  font-size: 22rpx;
}
.g-name {
  font-weight: 800;
  color: #243042;
}
.g-count {
  color: #8A96AC;
  font-weight: 700;
}
.strong {
  color: #0B9D60;
  font-style: normal;
}
.track {
  height: 10rpx;
  border-radius: 99rpx;
  background: #EAF0EA;
  margin-top: 12rpx;
  overflow: hidden;
}
.track .fill {
  background: linear-gradient(90deg, #22C55E, #0BA360);
}
.foot-note {
  display: block;
  text-align: center;
  margin-top: auto;
  padding-top: 22rpx;
  font-size: 20rpx;
  color: #9AA6BA;
  letter-spacing: 1rpx;
}
</style>
