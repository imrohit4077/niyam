/** Month bucket key `YYYY-MM` in local time */
export function monthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export function countInMonthKeys(isoDates: string[], keys: Set<string>) {
  let n = 0
  for (const iso of isoDates) {
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) continue
    if (keys.has(monthKey(d))) n += 1
  }
  return n
}

/** Compare count in last `days` vs the prior `days` window; returns trend pct or null if not meaningful */
export function trendPctVsPriorWindow(counts: { recent: number; prior: number }): { direction: 'up' | 'down' | 'flat'; pct: number } | null {
  const { recent, prior } = counts
  if (prior === 0 && recent === 0) return null
  if (prior === 0 && recent > 0) return { direction: 'up', pct: 100 }
  const raw = ((recent - prior) / prior) * 100
  const pct = Math.round(Math.abs(raw) >= 10 ? raw : Math.round(raw * 10) / 10)
  if (pct === 0) return { direction: 'flat', pct: 0 }
  return { direction: pct > 0 ? 'up' : 'down', pct: Math.abs(pct) }
}

export function windowDayCounts(isoDates: string[], recentDays: number, priorDays: number) {
  const now = Date.now()
  const recentStart = now - recentDays * 86400000
  const priorStart = now - (recentDays + priorDays) * 86400000
  let recent = 0
  let prior = 0
  for (const iso of isoDates) {
    const t = new Date(iso).getTime()
    if (Number.isNaN(t)) continue
    if (t >= recentStart) recent += 1
    else if (t >= priorStart && t < recentStart) prior += 1
  }
  return { recent, prior }
}
