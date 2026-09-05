import { API_BASE_URL } from './api-config.js'

const BASE_URL = API_BASE_URL

function showError(message) {
  uni.showToast({
    title: message || '请求失败，请稍后重试',
    icon: 'none'
  })
}

function request(method, url, data = {}) {
  return new Promise((resolve, reject) => {
    const token = uni.getStorageSync('eloToken')
    uni.request({
      url: `${BASE_URL}${url}`,
      method,
      data,
      timeout: 10000,
      header: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      success: res => {
        const body = res.data
        if (body && body.code === 0) {
          resolve(body.data)
          return
        }
        const message = (body && body.message) || `请求失败（${res.statusCode}）`
        if (res.statusCode === 401) {
          uni.removeStorageSync('eloToken')
          uni.removeStorageSync('eloUser')
          setTimeout(() => {
            uni.reLaunch({ url: '/pages/login/login' })
          }, 500)
        }
        const error = new Error(message)
        error.code = body && body.code
        showError(message)
        reject(error)
      },
      fail: err => {
        const message =
          err.errMsg && err.errMsg.includes('timeout')
            ? '请求超时，请检查后端服务'
            : '无法连接服务器，请确认后端已启动'
        showError(message)
        reject(new Error(message))
      }
    })
  })
}

export function get(url) {
  return request('GET', url)
}

export function post(url, data = {}) {
  return request('POST', url, data)
}

export function put(url, data = {}) {
  return request('PUT', url, data)
}

export function del(url, data = {}) {
  return request('DELETE', url, data)
}
