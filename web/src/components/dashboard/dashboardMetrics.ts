/** Inclusive start, exclusive end in ms. */
export function countInDateRange<T extends { created_at?: string; updated_at?: string }>(
  rows: T[],
  getDate: (row: T) => string | undefined,
  startMs: number,
  endMs: number,
): number {
  let n = 0
  for (const row of rows) {
    const raw = getDate(row)
    if (!raw) continue
    const t = new Date(raw).getTime()
    if (t >= startMs && t < endMs) n += 1
  }
  return n
}

export function percentChange(current: number, previous: number): { percent: number | null; up: boolean } {
  if (previous === 0 && current === 0) return { percent: null, up: true }
  if (previous === 0) return { percent: current > 0 ? 100 : null, up: true }
  const raw = Math.round(((current - previous) / previous) * 100)
  return { percent: raw, up: raw >= 0 }
}

export function trendDirectionFromDelta(current: number, previous: number): 'up' | 'down' | 'flat' {
  if (current === previous) return 'flat'
  return current > previous ? 'up' : 'down'
}
