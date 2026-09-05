import { createServer } from 'node:http'
import { randomUUID } from 'node:crypto'
import { db, nowIso } from './db.js'
import {
  hashPassword,
  verifyPassword,
  createSession,
  publicUser,
  findUserByToken,
  cleanupExpiredSessions
} from './auth.js'
import { handleGoalsRequest } from './goals.js'

const PORT = Number(process.env.PORT || 3000)
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

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

function bearerToken(req) {
  const header = req.headers.authorization || ''
  return header.startsWith('Bearer ') ? header.slice(7) : null
}

function accountNickname(account) {
  const name = account.includes('@') ? account.split('@')[0] : account
  return name.replace(/[._-]/g, '').slice(0, 16) || '用户'
}

async function handleAuthRegister(req, res) {
  const body = await readBody(req)
  const account = String(body.account || '').trim()
  const password = String(body.password || '')

  if (account.length < 3) {
    return send(res, 400, 10004, '账号长度不能少于 3 位')
  }
  if (account.includes('@') && !EMAIL_RE.test(account)) {
    return send(res, 400, 10004, '邮箱格式不正确')
  }
  if (password.length < 8) {
    return send(res, 400, 10004, '密码长度至少为 8 位')
  }

  const id = cryptoRandomId('user')
  const passwordHash = hashPassword(password)
  try {
    db.prepare(
      'INSERT INTO users (id, account, nickname, password_hash, created_at) VALUES (?, ?, ?, ?, ?)'
    ).run(id, account, accountNickname(account), passwordHash, nowIso())
  } catch (err) {
    if (String(err.message).includes('UNIQUE')) {
      return send(res, 409, 10002, '账号已存在')
    }
    throw err
  }
  return send(res, 200, 0, '注册成功', {
    user: publicUser({ id, account, nickname: accountNickname(account) })
  })
}

async function handleAuthLogin(req, res) {
  const body = await readBody(req)
  const account = String(body.account || '').trim()
  const password = String(body.password || '')
  if (!account || !password) {
    return send(res, 400, 10004, '请输入账号和密码')
  }

  const user = db.prepare('SELECT * FROM users WHERE account = ?').get(account)
  if (!user || !verifyPassword(password, user.password_hash)) {
    return send(res, 401, 10001, '账号或密码错误')
  }

  cleanupExpiredSessions()
  const token = createSession(user.id)
  return send(res, 200, 0, '登录成功', {
    token,
    user: publicUser(user)
  })
}

async function handleUsersMe(req, res, token) {
  const user = findUserByToken(token)
  if (!user) {
    return send(res, 401, 10001, '登录已失效，请重新登录')
  }
  return send(res, 200, 0, 'success', { user: publicUser(user) })
}

async function route(req, res) {
  const url = new URL(req.url, `http://localhost:${PORT}`)
  const path = url.pathname.replace(/\/+$/, '')

  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
    })
    return res.end()
  }

  if (path === '/v1/health' && req.method === 'GET') {
    return send(res, 200, 0, 'ok', { service: 'elo-backend', time: nowIso() })
  }

  if (path === '/v1/auth/register' && req.method === 'POST') {
    return handleAuthRegister(req, res)
  }
  if (path === '/v1/auth/login' && req.method === 'POST') {
    return handleAuthLogin(req, res)
  }

  const token = bearerToken(req)
  if (!token) {
    return send(res, 401, 10001, '请先登录')
  }

  if (path === '/v1/users/me' && req.method === 'GET') {
    return handleUsersMe(req, res, token)
  }

  const goalMatch = path.match(/^\/v1\/goals(?:\/([^/]+))?$/)
  if (goalMatch) {
    const user = findUserByToken(token)
    if (!user) {
      return send(res, 401, 10001, '登录已失效，请重新登录')
    }
    return handleGoalsRequest(req, res, user, goalMatch[1] || null)
  }

  return send(res, 404, 10404, '接口不存在')
}

function cryptoRandomId(prefix) {
  return `${prefix}_${randomUUID().replaceAll('-', '').slice(0, 20)}`
}

const server = createServer(route)
server.listen(PORT, () => {
  console.log(`elo backend running at http://localhost:${PORT}`)
  console.log('health: http://localhost:' + PORT + '/v1/health')
})
