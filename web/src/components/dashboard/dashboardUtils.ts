/** Count items whose ISO `dateField` falls in [start, end) */
export function countInRange<T>(items: T[], dateField: keyof T, start: Date, end: Date): number {
  const t0 = start.getTime()
  const t1 = end.getTime()
  return items.filter(item => {
    const raw = item[dateField]
    if (typeof raw !== 'string') return false
    const t = new Date(raw).getTime()
    return t >= t0 && t < t1
  }).length
}

export type TrendDir = 'up' | 'down' | 'flat'

export function comparePeriods(current: number, previous: number): { dir: TrendDir; pct: number | null } {
  if (previous === 0 && current === 0) return { dir: 'flat', pct: 0 }
  if (previous === 0) return { dir: 'up', pct: null }
  const raw = ((current - previous) / previous) * 100
  const pct = Math.round(Math.abs(raw))
  if (raw > 0.5) return { dir: 'up', pct }
  if (raw < -0.5) return { dir: 'down', pct }
  return { dir: 'flat', pct: 0 }
}

export function formatTrendLabel(dir: TrendDir, pct: number | null): string {
  if (dir === 'flat' && (pct === 0 || pct === null)) return '0%'
  if (pct === null) return 'new'
  const sign = dir === 'up' ? '↑' : dir === 'down' ? '↓' : '→'
  return `${sign} ${pct}%`
}
