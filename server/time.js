function pad(n) {
  return String(n).padStart(2, '0')
}

export function dateString(d = new Date()) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function weekdayFromDate(date) {
  const [y, m, d] = date.split('-').map(Number)
  const utc = new Date(Date.UTC(y, m - 1, d))
  return ((utc.getUTCDay() + 6) % 7) + 1
}

export function addDays(date, offset) {
  const [y, m, d] = date.split('-').map(Number)
  const utc = new Date(Date.UTC(y, m - 1, d + offset))
  return dateString(new Date(utc.getUTCFullYear(), utc.getUTCMonth(), utc.getUTCDate()))
}

export function mondayOf(date) {
  const wd = weekdayFromDate(date)
  return addDays(date, -(wd - 1))
}
