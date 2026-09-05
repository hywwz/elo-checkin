import { randomUUID } from 'node:crypto'
import { db, nowIso } from './db.js'
import { dateString, weekdayFromDate, mondayOf, addDays } from './time.js'

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/

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

function validateGoal(body) {
  const name = String(body.name || '').trim()
  const task = String(body.task || '').trim()
  const reminderTime = String(body.reminderTime || '').trim()
  const freq = body.freq && typeof body.freq === 'object' ? body.freq : {}
  const mode = freq.mode

  if (!name) return { error: '目标名称不能为空' }
  if (name.length > 50) return { error: '目标名称不能超过 50 个字符' }
  if (!task) return { error: '具体任务不能为空' }
  if (task.length > 200) return { error: '具体任务不能超过 200 个字符' }
  if (!TIME_RE.test(reminderTime)) return { error: '提醒时间格式应为 HH:mm' }
  if (!['daily', 'count', 'days'].includes(mode)) return { error: '打卡频率类型不正确' }

  let freqCount = null
  let freqDays = null
  if (mode === 'count') {
    freqCount = Number(freq.count)
    if (!Number.isInteger(freqCount) || freqCount < 1 || freqCount > 7) {
      return { error: '每周次数必须是 1-7 的整数' }
    }
  }
  if (mode === 'days') {
    const days = Array.isArray(freq.days) ? [...new Set(freq.days)].map(Number) : []
    if (!days.length || days.some(n => !Number.isInteger(n) || n < 1 || n > 7)) {
      return { error: '请选择 1-7 的星期值（1=周一）' }
    }
    freqDays = JSON.stringify(days.sort((a, b) => a - b))
  }

  return {
    value: {
      name,
      task,
      reminderTime,
      freqMode: mode,
      freqCount,
      freqDays
    }
  }
}

function rowToGoal(row) {
  return {
    id: row.id,
    name: row.name,
    task: row.task,
    freq: {
      mode: row.freq_mode,
      ...(row.freq_mode === 'count' ? { count: row.freq_count } : {}),
      ...(row.freq_mode === 'days' ? { days: JSON.parse(row.freq_days || '[]') } : {})
    },
    reminderTime: row.reminder_time,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

function countBetween(userId, goalId, start, end) {
  const row = db
    .prepare(
      `SELECT COUNT(*) AS c FROM checkins
       WHERE user_id = ? AND goal_id = ? AND date BETWEEN ? AND ?`
    )
    .get(userId, goalId, start, end)
  return Number(row.c || 0)
}

function doneOn(userId, goalId, date) {
  const row = db
    .prepare('SELECT id FROM checkins WHERE user_id = ? AND goal_id = ? AND date = ?')
    .get(userId, goalId, date)
  return Boolean(row)
}

function currentStreak(userId, today) {
  const rows = db
    .prepare(
      `SELECT DISTINCT date FROM checkins
       WHERE user_id = ? ORDER BY date DESC`
    )
    .all(userId)
  if (!rows.length) return 0

  const done = new Set(rows.map(r => r.date))
  let cursor = today
  if (!done.has(cursor)) {
    cursor = addDays(cursor, -1)
  }
  let streak = 0
  while (done.has(cursor)) {
    streak += 1
    cursor = addDays(cursor, -1)
  }
  return streak
}

function enrichGoal(userId, row, date) {
  const goal = rowToGoal(row)
  const weekStart = mondayOf(date)
  const weekEnd = addDays(weekStart, 6)
  goal.doneToday = doneOn(userId, goal.id, date)
  goal.weeklyDone = countBetween(userId, goal.id, weekStart, weekEnd)
  goal.visibleOnDate =
    goal.freq.mode !== 'days' || goal.freq.days.includes(weekdayFromDate(date))
  return goal
}

async function listGoals(req, res, user) {
  const url = new URL(req.url, 'http://localhost')
  const date = url.searchParams.get('date') || dateString()
  if (!isValidDate(date)) {
    return send(res, 400, 10004, 'date 参数格式应为 YYYY-MM-DD')
  }

  const rows = db.prepare('SELECT * FROM goals WHERE user_id = ? ORDER BY created_at ASC').all(user.id)
  const goals = rows.map(row => enrichGoal(user.id, row, date))
  const streak = currentStreak(user.id, date)
  return send(res, 200, 0, 'success', { goals, streak })
}

async function createGoal(req, res, user) {
  const body = await readBody(req)
  const { error, value } = validateGoal(body)
  if (error) {
    return send(res, 400, 10004, error)
  }

  const id = `goal_${randomUUID().replaceAll('-', '').slice(0, 20)}`
  const timestamp = nowIso()
  db.prepare(
    `INSERT INTO goals
      (id, user_id, name, task, freq_mode, freq_count, freq_days, reminder_time, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    user.id,
    value.name,
    value.task,
    value.freqMode,
    value.freqCount,
    value.freqDays,
    value.reminderTime,
    timestamp,
    timestamp
  )

  const row = db.prepare('SELECT * FROM goals WHERE id = ?').get(id)
  return send(res, 200, 0, 'success', { goal: rowToGoal(row) })
}

function findOwnedGoal(userId, goalId) {
  return db.prepare('SELECT * FROM goals WHERE id = ? AND user_id = ?').get(goalId, userId)
}

async function getGoal(req, res, user, goalId) {
  const row = findOwnedGoal(user.id, goalId)
  if (!row) {
    return send(res, 404, 10005, '目标不存在或不属于当前用户')
  }
  return send(res, 200, 0, 'success', { goal: rowToGoal(row) })
}

async function updateGoal(req, res, user, goalId) {
  const existing = findOwnedGoal(user.id, goalId)
  if (!existing) {
    return send(res, 404, 10005, '目标不存在或不属于当前用户')
  }

  const body = await readBody(req)
  const { error, value } = validateGoal(body)
  if (error) {
    return send(res, 400, 10004, error)
  }

  db.prepare(
    `UPDATE goals
     SET name = ?, task = ?, freq_mode = ?, freq_count = ?, freq_days = ?,
         reminder_time = ?, updated_at = ?
     WHERE id = ? AND user_id = ?`
  ).run(
    value.name,
    value.task,
    value.freqMode,
    value.freqCount,
    value.freqDays,
    value.reminderTime,
    nowIso(),
    goalId,
    user.id
  )

  const row = db.prepare('SELECT * FROM goals WHERE id = ?').get(goalId)
  return send(res, 200, 0, 'success', { goal: rowToGoal(row) })
}

async function deleteGoal(req, res, user, goalId) {
  const existing = findOwnedGoal(user.id, goalId)
  if (!existing) {
    return send(res, 404, 10005, '目标不存在或不属于当前用户')
  }

  db.exec('BEGIN')
  try {
    db.prepare('DELETE FROM checkins WHERE goal_id = ?').run(goalId)
    db.prepare('DELETE FROM goals WHERE id = ? AND user_id = ?').run(goalId, user.id)
    db.exec('COMMIT')
  } catch (err) {
    db.exec('ROLLBACK')
    throw err
  }

  return send(res, 200, 0, 'success', null)
}

export async function handleGoalsRequest(req, res, user, goalId) {
  if (goalId) {
    if (req.method === 'GET') return getGoal(req, res, user, goalId)
    if (req.method === 'PUT') return updateGoal(req, res, user, goalId)
    if (req.method === 'DELETE') return deleteGoal(req, res, user, goalId)
    return send(res, 405, 10004, '请求方法不支持')
  }

  if (req.method === 'GET') return listGoals(req, res, user)
  if (req.method === 'POST') return createGoal(req, res, user)
  return send(res, 405, 10004, '请求方法不支持')
}
