/** Bucket UTC dates into YYYY-MM for lightweight month-over-month trends on the dashboard. */

export function monthKeyUtc(iso: string) {
  const d = new Date(iso)
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
}

export function currentAndPreviousMonthKeys() {
  const now = new Date()
  const y = now.getUTCFullYear()
  const m = now.getUTCMonth()
  const prev = m === 0 ? { y: y - 1, m: 11 } : { y, m: m - 1 }
  const curKey = `${y}-${String(m + 1).padStart(2, '0')}`
  const prevKey = `${prev.y}-${String(prev.m + 1).padStart(2, '0')}`
  return { curKey, prevKey }
}

export function percentChange(prev: number, cur: number): { pct: number; direction: 'up' | 'down' | 'flat' } {
  if (prev === 0 && cur === 0) return { pct: 0, direction: 'flat' }
  if (prev === 0 && cur > 0) return { pct: 100, direction: 'up' }
  const raw = ((cur - prev) / prev) * 100
  const pct = Math.round(raw)
  if (pct === 0) return { pct: 0, direction: 'flat' }
  return { pct: Math.abs(pct), direction: raw > 0 ? 'up' : 'down' }
}
