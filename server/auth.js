import crypto from 'node:crypto'
import { db, nowIso } from './db.js'

const TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000
const ADMIN_ACCOUNTS = String(process.env.ADMIN_ACCOUNTS || '测试1')
  .split(',')
  .map(s => s.trim().toLowerCase())
  .filter(Boolean)

export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex')
  const hash = crypto.scryptSync(password, salt, 64).toString('hex')
  return `${salt}:${hash}`
}

export function verifyPassword(password, stored) {
  const [salt, hash] = stored.split(':')
  const candidate = crypto.scryptSync(password, salt, 64).toString('hex')
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(candidate, 'hex'))
}

export function changePassword(userId, oldPassword, newPassword) {
  const user = db
    .prepare('SELECT password_hash FROM users WHERE id = ?')
    .get(userId)
  if (!user) {
    const err = new Error('用户不存在')
    err.status = 404
    err.code = 10001
    err.expose = true
    throw err
  }
  if (!verifyPassword(oldPassword, user.password_hash)) {
    const err = new Error('旧密码错误')
    err.status = 400
    err.code = 10004
    err.expose = true
    throw err
  }
  if (oldPassword === newPassword) {
    const err = new Error('新密码不能与旧密码相同')
    err.status = 400
    err.code = 10004
    err.expose = true
    throw err
  }

  const passwordHash = hashPassword(newPassword)
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(
    passwordHash,
    userId
  )
  // 踢掉该用户全部已登录会话，强制使用新密码重新登录
  db.prepare('DELETE FROM sessions WHERE user_id = ?').run(userId)
}

export function revokeSession(token) {
  db.prepare('DELETE FROM sessions WHERE token = ?').run(token)
}

export function isAdminAccount(account) {
  return ADMIN_ACCOUNTS.includes(String(account || '').trim().toLowerCase())
}

export function createSession(userId) {
  const token = crypto.randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MS).toISOString()
  db.prepare('INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)').run(
    token,
    userId,
    expiresAt
  )
  return token
}

export function publicUser(user) {
  return {
    id: user.id,
    account: user.account,
    nickname: user.nickname
  }
}

export function findUserByToken(token) {
  if (!token) return null
  const row = db
    .prepare(
      `SELECT u.id, u.account, u.nickname, u.created_at
       FROM sessions s
       JOIN users u ON u.id = s.user_id
       WHERE s.token = ?`
    )
    .get(token)
  if (!row) return null
  return row
}

export function cleanupExpiredSessions() {
  db.prepare('DELETE FROM sessions WHERE expires_at < ?').run(nowIso())
}
