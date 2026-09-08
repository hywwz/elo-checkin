import { get } from './request.js'

// #ifdef APP-PLUS
import {
  scheduleNotification,
  cancelScheduledNotification,
  showNotification,
  isNotificationEnabled,
  isExactAlarmEnabled
} from '@/uni_modules/elo-notify'
// #endif

const HORIZON_DAYS = 30
const MAX_ALARMS = 450
const RISK_HOUR = 22
const RISK_MINUTE = 0
const RISK_CHANNEL = { channelId: 'elo_reminder_banner', channelName: '打卡提醒' }

const MILESTONE_TEXTS = {
  7: '恭喜你完成连续打卡 7 天！你用自己的节奏，证明了坚持可以很温柔。',
  30: '恭喜你完成连续打卡 30 天！一个月的重复，已经悄悄把好习惯种进了你的生活。',
  100: '恭喜你完成连续打卡 100 天！一百个日夜的坚持，真的不是一件容易的事。',
  365: '恭喜你完成连续打卡 365 天！一年之约达成，这份坚持值得为你骄傲。'
}

const STORE_RISK = 'eloNotifyRiskEnabled'
const STORE_ACHIEVEMENT = 'eloNotifyAchievementEnabled'
const STORE_PENDING = 'eloNotifyPendingReminders'

function pad(n) {
  return String(n).padStart(2, '0')
}

function localDateStr(d = new Date()) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function shiftDate(dateStr, offset) {
  const [y, m, d] = dateStr.split('-').map(Number)
  return localDateStr(new Date(y, m - 1, d + offset))
}

function weekdayOf(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number)
  return (new Date(y, m - 1, d).getDay() + 6) % 7 + 1
}

function msAt(dateStr, hour, minute) {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d, hour, minute, 0, 0).getTime()
}

function parseTime(timeText) {
  const [h, m] = String(timeText || '21:30').split(':').map(Number)
  if (!Number.isInteger(h) || !Number.isInteger(m) || h < 0 || h > 23 || m < 0 || m > 59) {
    return null
  }
  return { hour: h, minute: m }
}

export function riskEnabled() {
  const stored = uni.getStorageSync(STORE_RISK)
  return stored === '' || stored === undefined ? true : stored !== false
}

export function achievementEnabled() {
  const stored = uni.getStorageSync(STORE_ACHIEVEMENT)
  return stored === '' || stored === undefined ? true : stored !== false
}

export function setRiskEnabled(value) {
  uni.setStorageSync(STORE_RISK, value === true)
}

export function setAchievementEnabled(value) {
  uni.setStorageSync(STORE_ACHIEVEMENT, value === true)
}

function readPending() {
  const list = uni.getStorageSync(STORE_PENDING)
  return Array.isArray(list) ? list : []
}

function savePending(list) {
  uni.setStorageSync(STORE_PENDING, list)
}

export function cancelAllReminders() {
  // #ifdef APP-PLUS
  const list = readPending()
  for (const item of list) {
    try {
      cancelScheduledNotification(item.id)
    } catch (err) {
      // 单条清理失败不影响其它
    }
  }
  uni.removeStorageSync(STORE_PENDING)
  // #endif
}

function goalScheduledOnDate(goal, dateStr) {
  const freq = goal.freq || { mode: 'daily' }
  if (freq.mode === 'days') {
    return Array.isArray(freq.days) && freq.days.includes(weekdayOf(dateStr))
  }
  return true
}

function countModeStillNeedsWeek(goal, dateStr) {
  const freq = goal.freq || {}
  if (freq.mode !== 'count') return true
  const count = Number(freq.count || 3)
  const today = localDateStr()
  const todayWeekday = weekdayOf(today)
  const monday = shiftDate(today, -(todayWeekday - 1))
  const sunday = shiftDate(monday, 6)
  if (dateStr >= monday && dateStr <= sunday) {
    return Number(goal.weeklyDone || 0) < count
  }
  return true
}

function riskText(goal) {
  const task = (goal.task || goal.name || '').trim()
  return `距离今天结束还有 2 小时，如果现在有空，试着做做「${task}」吧。连续纪录断了有点可惜，但只要愿意，重新开始也依然值得。`
}

function onTimeText(goal) {
  return `今天的「${goal.name || ''}」时间到了。不必追求完美，完成了就很好。`
}

export function syncReminders(goals) {
  // #ifdef APP-PLUS
  cancelAllReminders()
  if (!Array.isArray(goals)) {
    return { ok: false, reason: 'no-goals' }
  }
  if (!isNotificationEnabled()) {
    return { ok: false, reason: 'notification-disabled' }
  }

  const today = localDateStr()
  const now = Date.now()
  const pending = []
  const exact = isExactAlarmEnabled()

  for (let offset = 0; offset < HORIZON_DAYS; offset += 1) {
    const dateStr = shiftDate(today, offset)
    for (const goal of goals) {
      if (!goal || !goal.id || !goalScheduledOnDate(goal, dateStr)) continue
      if (!countModeStillNeedsWeek(goal, dateStr)) continue
      if (offset === 0 && goal.doneToday) continue

      const time = parseTime(goal.reminderTime)
      if (!time) continue

      const items = []
      const onTimeAt = msAt(dateStr, time.hour, time.minute)
      if (onTimeAt > now) {
        items.push({
          goalId: goal.id,
          kind: 'on-time',
          title: '打卡提醒',
          content: onTimeText(goal),
          triggerAt: onTimeAt
        })
      }

      if (riskEnabled()) {
        const riskAt = msAt(dateStr, RISK_HOUR, RISK_MINUTE)
        if (riskAt > now) {
          items.push({
            goalId: goal.id,
            kind: 'risk',
            title: '打卡提醒',
            content: riskText(goal),
            triggerAt: riskAt
          })
        }
      }

      for (const item of items) {
        if (pending.length >= MAX_ALARMS) continue
        const id = 100000 + pending.length + 1
        let scheduledId = -1
        try {
          scheduledId = scheduleNotification({
            id,
            ...item,
            exact,
            ...RISK_CHANNEL
          })
        } catch (err) {
          scheduledId = -1
        }
        if (scheduledId > 0) {
          pending.push({ id, goalId: goal.id, kind: item.kind, triggerAt: item.triggerAt })
        }
      }
    }
  }

  savePending(pending)
  return { ok: true, count: pending.length }
  // #endif

  // #ifndef APP-PLUS
  return { ok: false, reason: 'platform' }
  // #endif
}

export async function syncAllReminders() {
  if (!uni.getStorageSync('eloToken')) {
    return { ok: false, reason: 'no-token' }
  }
  try {
    const data = await get(`/goals?date=${localDateStr()}`, { silent: true })
    return syncReminders((data && data.goals) || [])
  } catch (err) {
    return { ok: false, reason: 'network' }
  }
}

export function showMilestoneNotification(days) {
  // #ifdef APP-PLUS
  const text = MILESTONE_TEXTS[days]
  if (!text || !isNotificationEnabled()) return
  showNotification({
    id: 81001,
    title: `连续打卡 ${days} 天`,
    content: text,
    ...RISK_CHANNEL
  })
  // #endif
}

export const MILESTONES = Object.keys(MILESTONE_TEXTS).map(Number).sort((a, b) => a - b)
