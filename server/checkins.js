import { randomUUID } from 'node:crypto'
import { db, nowIso } from './db.js'
import { dateString, weekdayFromDate, mondayOf, addDays } from './time.js'

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

function readBody(req) {
  return new Promise((resolve, reject) => {
    let raw = ''
    req.on('data', chunk => {
      raw += chunk
      if (raw.length > 1e6) {
        reject(new Error('body_too_large'))
        req.destroy()
      }
    })
    req.on('end', () => {
      try {
        resolve(raw ? JSON.parse(raw) : {})
      } catch (err) {
        reject(err)
      }
    })
    req.on('error', reject)
  })
}

function isValidDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value)
}

function ownedGoal(userId, goalId) {
  return db.prepare('SELECT * FROM goals WHERE id = ? AND user_id = ?').get(goalId, userId)
}

function parseGoal(row) {
  return {
    mode: row.freq_mode,
    count: row.freq_count,
    days: row.freq_days ? JSON.parse(row.freq_days) : null
  }
}

async function listCheckins(req, res, user) {
  const url = new URL(req.url, 'http://localhost')
  const date = url.searchParams.get('date') || dateString()
  if (!isValidDate(date)) {
    return send(res, 400, 10004, 'date 参数格式应为 YYYY-MM-DD')
  }
  const rows = db
    .prepare('SELECT * FROM checkins WHERE user_id = ? AND date = ? ORDER BY created_at ASC')
    .all(user.id, date)
  const records = rows.map(row => ({
    id: row.id,
    goalId: row.goal_id,
    date: row.date
  }))
  return send(res, 200, 0, 'success', { records })
}

async function createCheckin(req, res, user) {
  const body = await readBody(req)
  const goalId = String(body.goalId || '')
  const date = body.date ? String(body.date) : dateString()
  if (!isValidDate(date)) {
    return send(res, 400, 10004, 'date 格式应为 YYYY-MM-DD')
  }
  if (!goalId) {
    return send(res, 400, 10004, 'goalId 不能为空')
  }

  const goal = ownedGoal(user.id, goalId)
  if (!goal) {
    return send(res, 404, 10005, '目标不存在或不属于当前用户')
  }

  const freq = parseGoal(goal)
  if (freq.mode === 'days' && !freq.days.includes(weekdayFromDate(date))) {
    return send(res, 400, 10007, '当前不是该目标的打卡日')
  }

  const exists = db
    .prepare('SELECT id FROM checkins WHERE user_id = ? AND goal_id = ? AND date = ?')
    .get(user.id, goalId, date)
  if (exists) {
    return send(res, 400, 10006, '今日已打卡，请勿重复提交')
  }

  const id = `checkin_${randomUUID().replaceAll('-', '').slice(0, 20)}`
  db.prepare(
    'INSERT INTO checkins (id, user_id, goal_id, date, created_at) VALUES (?, ?, ?, ?, ?)'
  ).run(id, user.id, goalId, date, nowIso())

  return send(res, 200, 0, '打卡成功', {
    checkin: { id, goalId, date }
  })
}

async function cancelToday(req, res, user) {
  const body = await readBody(req)
  const goalId = String(body.goalId || '')
  const date = dateString()
  if (!goalId) {
    return send(res, 400, 10004, 'goalId 不能为空')
  }
  db.prepare('DELETE FROM checkins WHERE user_id = ? AND goal_id = ? AND date = ?').run(
    user.id,
    goalId,
    date
  )
  return send(res, 200, 0, '已取消', null)
}

export async function handleCheckinsRequest(req, res, user, todayOnly) {
  if (todayOnly) {
    if (req.method === 'DELETE') return cancelToday(req, res, user)
    return send(res, 405, 10004, '请求方法不支持')
  }
  if (req.method === 'GET') return listCheckins(req, res, user)
  if (req.method === 'POST') return createCheckin(req, res, user)
  return send(res, 405, 10004, '请求方法不支持')
}

export async function handleWeekProgress(req, res, user, goalId) {
  const url = new URL(req.url, 'http://localhost')
  const date = url.searchParams.get('date') || dateString()
  if (!isValidDate(date)) {
    return send(res, 400, 10004, 'date 格式应为 YYYY-MM-DD')
  }
  const goal = ownedGoal(user.id, goalId)
  if (!goal) {
    return send(res, 404, 10005, '目标不存在或不属于当前用户')
  }

  const weekStart = mondayOf(date)
  const weekEnd = addDays(weekStart, 6)
  const row = db
    .prepare(
      `SELECT COUNT(*) AS c FROM checkins
       WHERE user_id = ? AND goal_id = ? AND date BETWEEN ? AND ?`
    )
    .get(user.id, goalId, weekStart, weekEnd)
  const weeklyDone = Number(row.c || 0)

  const freq = parseGoal(goal)
  let target = 7
  if (freq.mode === 'count') target = freq.count
  if (freq.mode === 'days') target = freq.days.length

  return send(res, 200, 0, 'success', {
    weekStart,
    weekEnd,
    weeklyDone,
    weeklyTarget: target,
    completed: weeklyDone >= target
  })
}
