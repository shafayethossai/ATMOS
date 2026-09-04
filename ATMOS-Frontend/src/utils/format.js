export function cn(...classes) {
  return classes.filter(Boolean).join(' ')
}

export function fmtTime(date) {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

export function fmtShortTime(date) {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export function fmtDate(date) {
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function fmtNum(n, decimals = 1) {
  return Number(n).toFixed(decimals)
}

export function pct(value, max) {
  return Math.min((value / max) * 100, 100)
}
