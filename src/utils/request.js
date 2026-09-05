// 后端接口基础地址
// H5/微信开发者工具：本机运行后端可用 localhost
// 真机调试时请改成电脑局域网地址，例如 http://192.168.x.x:3000/v1
const BASE_URL = 'http://localhost:3000/v1'

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
