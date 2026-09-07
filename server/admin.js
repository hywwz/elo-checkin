import crypto from 'node:crypto'
import { db } from './db.js'
import { hashPassword, isAdminAccount, revokeUserSessions } from './auth.js'

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

function findUser(userId) {
  return db
    .prepare('SELECT id, account, nickname, created_at FROM users WHERE id = ?')
    .get(userId)
}

export function handleAdminUsers(req, res) {
  const rows = db
    .prepare(
      `SELECT u.id, u.account, u.nickname, u.created_at,
              (SELECT COUNT(*) FROM goals g WHERE g.user_id = u.id) AS goal_count,
              (SELECT COUNT(*) FROM checkins c WHERE c.user_id = u.id) AS checkin_count,
              (SELECT MAX(c.date) FROM checkins c WHERE c.user_id = u.id) AS last_date
       FROM users u
       ORDER BY u.created_at ASC`
    )
    .all()
  const users = rows.map(r => ({
    id: r.id,
    account: r.account,
    nickname: r.nickname,
    createdAt: r.created_at,
    goalCount: Number(r.goal_count || 0),
    checkinCount: Number(r.checkin_count || 0),
    lastDate: r.last_date || null
  }))
  return send(res, 200, 0, 'success', { users })
}

export function handleAdminUserRecords(req, res, userId) {
  const user = findUser(userId)
  if (!user) {
    return send(res, 404, 10003, '用户不存在')
  }

  const goalRows = db
    .prepare(
      `SELECT g.id, g.name, g.task, g.freq_mode, g.freq_count, g.freq_days,
              (SELECT COUNT(*) FROM checkins c WHERE c.user_id = g.user_id AND c.goal_id = g.id) AS total
       FROM goals g
       WHERE g.user_id = ?
       ORDER BY g.created_at ASC`
    )
    .all(userId)
  const goals = goalRows.map(g => ({
    id: g.id,
    name: g.name,
    task: g.task,
    freq: {
      mode: g.freq_mode,
      ...(g.freq_mode === 'count' ? { count: g.freq_count } : {}),
      ...(g.freq_mode === 'days' ? { days: JSON.parse(g.freq_days || '[]') } : {})
    },
    totalCheckins: Number(g.total || 0)
  }))

  const recordRows = db
    .prepare(
      `SELECT c.id, c.date, c.created_at, c.goal_id, g.name AS goal_name
       FROM checkins c
       JOIN goals g ON g.id = c.goal_id
       WHERE c.user_id = ?
       ORDER BY c.date DESC, c.created_at DESC
       LIMIT 1000`
    )
    .all(userId)
  const records = recordRows.map(r => ({
    id: r.id,
    date: r.date,
    goalId: r.goal_id,
    goalName: r.goal_name,
    createdAt: r.created_at
  }))

  return send(res, 200, 0, 'success', {
    user: {
      id: user.id,
      account: user.account,
      nickname: user.nickname,
      createdAt: user.created_at
    },
    goals,
    records
  })
}

export function handleAdminResetPassword(req, res, userId) {
  const user = findUser(userId)
  if (!user) {
    return send(res, 404, 10003, '用户不存在')
  }

  const temporaryPassword = crypto.randomBytes(9).toString('base64url')
  const passwordHash = hashPassword(temporaryPassword)
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(passwordHash, userId)
  // 重置后让该用户所有登录会话失效，强制用临时密码重新登录
  revokeUserSessions(userId, '密码已被管理员重置，请使用临时密码重新登录')

  return send(res, 200, 0, '重置成功，请把临时密码告知用户', {
    userId,
    temporaryPassword
  })
}

export function handleAdminForceLogout(req, res, userId) {
  const user = findUser(userId)
  if (!user) {
    return send(res, 404, 10003, '用户不存在')
  }
  revokeUserSessions(userId, '账号已被管理员强制下线，请重新登录')
  return send(res, 200, 0, '用户已强制下线', { userId })
}

export function handleAdminDeleteUser(req, res, userId) {
  const user = db
    .prepare('SELECT id, account, nickname FROM users WHERE id = ?')
    .get(userId)
  if (!user) {
    return send(res, 404, 10003, '用户不存在')
  }
  if (isAdminAccount(user.account)) {
    return send(res, 400, 10004, '不能删除管理员账号')
  }

  db.exec('BEGIN')
  try {
    revokeUserSessions(userId, '账号已被管理员删除')
    db.prepare('DELETE FROM checkins WHERE user_id = ?').run(userId)
    db.prepare('DELETE FROM goals WHERE user_id = ?').run(userId)
    db.prepare('DELETE FROM users WHERE id = ?').run(userId)
    db.exec('COMMIT')
  } catch (err) {
    db.exec('ROLLBACK')
    throw err
  }

  return send(res, 200, 0, '用户已删除', { userId })
}
