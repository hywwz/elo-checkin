import { db } from './db.js'
import { dateString, addDays, weekdayFromDate } from './time.js'

function send(res, status, code, message, data = null) {
  const body = JSON.stringify({ code, message, data })
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
  })
  res.end(body)
}

function pad(n) {
  return String(n).padStart(2, '0')
}

function parseDate(s) {
  const [y, m, d] = s.split('-').map(Number)
  return { y, m, d }
}

function monthDelta(s, delta) {
  const { y, m, d } = parseDate(s)
  const total = y * 12 + (m - 1) + delta
  const ny = Math.floor(total / 12)
  const nm = (total % 12) + 1
  const nd = Math.min(d, new Date(Date.UTC(ny, nm, 0)).getUTCDate())
  return `${ny}-${pad(nm)}-${pad(nd)}`
}

function lastDayOfMonth(s) {
  const { y, m } = parseDate(s)
  return `${y}-${pad(m)}-${pad(new Date(Date.UTC(y, m, 0)).getUTCDate())}`
}

function firstDayOfMonth(s) {
  const { y, m } = parseDate(s)
  return `${y}-${pad(m)}-01`
}

function periodRange(period, today) {
  if (period === 'this_year') {
    const y = parseDate(today).y
    return { start: `${y}-01-01`, end: today, short: '今年' }
  }
  if (period === 'last_month') {
    const prev = monthDelta(today, -1)
    return { start: firstDayOfMonth(prev), end: lastDayOfMonth(prev), short: '上月' }
  }
  if (period === 'this_month') {
    return { start: firstDayOfMonth(today), end: today, short: '本月' }
  }
  return null
}

function previousRange(period, today) {
  if (period === 'this_month') return periodRange('last_month', today)
  if (period === 'last_month') return periodRange('last_month', monthDelta(today, -2))
  if (period === 'this_year') {
    const y = parseDate(today).y - 1
    return { start: `${y}-01-01`, end: `${y}-12-31`, short: '去年' }
  }
  return null
}

function distinctDates(userId, start, end) {
  const rows = db
    .prepare(
      `SELECT DISTINCT date FROM checkins
       WHERE user_id = ? AND date BETWEEN ? AND ?
       ORDER BY date ASC`
    )
    .all(userId, start, end)
  return rows.map(r => r.date)
}

function countCheckins(userId, start, end) {
  const row = db
    .prepare(
      `SELECT COUNT(*) AS c FROM checkins
       WHERE user_id = ? AND date BETWEEN ? AND ?`
    )
    .get(userId, start, end)
  return Number(row.c || 0)
}

function scheduleCount(goal, start, end) {
  const mode = goal.freq_mode
  const created = dateString(new Date(goal.created_at))
  let from = created > start ? created : start
  if (from > end) return 0

  const freqDays = goal.freq_days ? JSON.parse(goal.freq_days) : []
  let total = 0
  let cursor = from
  let i = 0
  while (cursor <= end && i < 400) {
    const wd = weekdayFromDate(cursor)
    if (mode === 'daily' || mode === 'count' || freqDays.includes(wd)) {
      total += 1
    }
    cursor = addDays(cursor, 1)
    i += 1
  }

  if (mode === 'count') {
    const weeks = Math.ceil(total / 7)
    return Math.max(0, weeks * Number(goal.freq_count || 3))
  }
  return total
}

function scheduledDates(goals, start, end) {
  const dates = new Set()
  for (const goal of goals) {
    const mode = goal.freq_mode
    const created = dateString(new Date(goal.created_at))
    const freqDays = goal.freq_days ? JSON.parse(goal.freq_days) : []
    let cursor = created > start ? created : start
    let i = 0
    while (cursor <= end && i < 400) {
      const wd = weekdayFromDate(cursor)
      if (mode === 'daily' || mode === 'count' || freqDays.includes(wd)) {
        dates.add(cursor)
      }
      cursor = addDays(cursor, 1)
      i += 1
    }
  }
  return [...dates].sort()
}

function longestStreak(dates) {
  if (!dates.length) return 0
  let best = 1
  let current = 1
  for (let i = 1; i < dates.length; i += 1) {
    if (addDays(dates[i - 1], 1) === dates[i]) {
      current += 1
    } else {
      current = 1
    }
    best = Math.max(best, current)
  }
  return best
}

function ratePercent(done, scheduled) {
  if (!scheduled) return 0
  return Math.round((done / scheduled) * 100)
}

function trendForMonth(userId, range) {
  const days = []
  for (let i = 6; i >= 0; i -= 1) {
    days.push(addDays(range.end, -i))
  }
  const items = days.map(date => {
    const row = db
      .prepare('SELECT COUNT(*) AS c FROM checkins WHERE user_id = ? AND date = ?')
      .get(userId, date)
    return {
      label: String(new Date(`${date}T00:00:00Z`).getUTCDay()),
      value: Number(row.c || 0)
    }
  })
  const weekLabels = ['日', '一', '二', '三', '四', '五', '六']
  return {
    title: '最近 7 天',
    caption: '柱高 = 当天完成任务数',
    max: Math.max(1, ...items.map(x => x.value)),
    items: items.map((item, idx) => ({
      label: idx === 0 ? weekLabels[Number(item.label)] : weekLabels[Number(item.label)],
      value: item.value
    }))
  }
}

function trendForYear(userId, today) {
  const y = parseDate(today).y
  const items = []
  for (let m = 1; m <= 12; m += 1) {
    const start = `${y}-${pad(m)}-01`
    const end =
      m < parseDate(today).m
        ? lastDayOfMonth(start)
        : m === parseDate(today).m
          ? today
          : null
    if (!end) break
    items.push({ label: `${m}月`, value: countCheckins(userId, start, end) })
  }
  return {
    title: '年度趋势',
    caption: '柱高 = 当月打卡次数',
    max: Math.max(1, ...items.map(x => x.value)),
    items
  }
}

function goalStats(userId, range) {
  const goals = db
    .prepare('SELECT * FROM goals WHERE user_id = ? ORDER BY created_at ASC')
    .all(userId)
  return goals.map(g => {
    const row = db
      .prepare(
        `SELECT COUNT(*) AS c FROM checkins
         WHERE user_id = ? AND goal_id = ? AND date BETWEEN ? AND ?`
      )
      .get(userId, g.id, range.start, range.end)
    return {
      name: g.name,
      completed: Number(row.c || 0),
      target: scheduleCount(g, range.start, range.end)
    }
  })
}

export async function handleStatistics(req, res, user) {
  const url = new URL(req.url, 'http://localhost')
  const period = url.searchParams.get('period')
  const today = dateString()
  const range = periodRange(period, today)
  if (!range) {
    return send(res, 400, 10004, 'period 必须是 this_month / last_month / this_year')
  }

  const goals = db
    .prepare('SELECT * FROM goals WHERE user_id = ? ORDER BY created_at ASC')
    .all(user.id)
  const doneDates = distinctDates(user.id, range.start, range.end)
  const scheduled = scheduledDates(goals, range.start, range.end)
  const done = doneDates.length
  const rate = ratePercent(done, scheduled.length)
  const totalCheckins = countCheckins(user.id, range.start, range.end)

  const allDates = distinctDates(user.id, '0000-01-01', '9999-12-31')
  const prev = previousRange(period, today)
  let deltaText = '暂无上期对比'
  if (prev) {
    const prevRate = ratePercent(
      distinctDates(user.id, prev.start, prev.end).length,
      scheduledDates(goals, prev.start, prev.end).length
    )
    const diff = rate - prevRate
    const prefix = diff >= 0 ? '较上期 +' : '较上期 -'
    deltaText = `${prefix}${Math.abs(diff)}%`
  }

  const trend =
    period === 'this_year' ? trendForYear(user.id, today) : trendForMonth(user.id, range)

  const data = {
    periodLabel: `${range.short}打卡率`,
    delta: deltaText,
    rate,
    title: `${range.short}已打卡 ${done} 天`,
    desc: `累计完成 ${totalCheckins} 次 · 目标 ${scheduled.length} 次`,
    totals: {
      value: allDates.length,
      unit: '天',
      label: '累计坚持'
    },
    streak: {
      value: longestStreak(allDates),
      unit: '天',
      label: '最长连续'
    },
    trend,
    goals: goalStats(user.id, range)
  }
  return send(res, 200, 0, 'success', data)
}
