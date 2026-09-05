export function dateString(d = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(d)
  const pick = type => parts.find(p => p.type === type).value
  return `${pick('year')}-${pick('month')}-${pick('day')}`
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
