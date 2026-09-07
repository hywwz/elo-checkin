import { API_BASE_URL } from './api-config.js'

const BASE_URL = API_BASE_URL

function showError(message) {
  uni.showToast({
    title: message || '请求失败，请稍后重试',
    icon: 'none'
  })
}

function request(method, url, data = {}, options = {}) {
  return new Promise((resolve, reject) => {
    const silent = options.silent === true
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
          if (!silent) {
            setTimeout(() => {
              uni.reLaunch({ url: '/pages/login/login' })
            }, 500)
          }
        }
        const error = new Error(message)
        error.code = body && body.code
        if (!silent) {
          showError(message)
        }
        reject(error)
      },
      fail: err => {
        const message =
          err.errMsg && err.errMsg.includes('timeout')
            ? '请求超时，请检查后端服务'
            : '无法连接服务器，请确认后端已启动'
        if (!silent) {
          showError(message)
        }
        const error = new Error(message)
        error.offline = true
        reject(error)
      }
    })
  })
}

export function get(url, options) {
  return request('GET', url, {}, options)
}

export function post(url, data = {}, options) {
  return request('POST', url, data, options)
}

export function put(url, data = {}, options) {
  return request('PUT', url, data, options)
}

export function del(url, data = {}, options) {
  return request('DELETE', url, data, options)
}
