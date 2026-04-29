/**
 * Simple period-over-period counts for 7-day windows; used for dashboard trend labels.
 */
export function countInDateRange(
  items: { created_at: string }[],
  fromMs: number,
  toMs: number,
): number {
  return items.filter(i => {
    const t = new Date(i.created_at).getTime()
    return t >= fromMs && t < toMs
  }).length
}

export function trendMeta(current: number, previous: number, zeroLabel: string) {
  if (previous === 0 && current === 0) {
    return { direction: 'flat' as const, pct: null as number | null, sublabel: zeroLabel }
  }
  if (previous === 0) {
    return { direction: 'up' as const, pct: null, sublabel: 'new this period' }
  }
  const raw = ((current - previous) / previous) * 100
  const rounded = Math.round(Math.abs(raw))
  const direction = raw > 0 ? ('up' as const) : raw < 0 ? ('down' as const) : ('flat' as const)
  return { direction, pct: Math.min(rounded, 999), sublabel: 'vs prior 7d' }
}

export function twoWeekBlockCreatedTrend<T extends { created_at: string }>(items: T[], now = new Date()) {
  const end = now.getTime()
  const w = 7 * 24 * 60 * 60 * 1000
  return {
    last: countInDateRange(items, end - w, end),
    prev: countInDateRange(items, end - 2 * w, end - w),
  }
}

/** Count applications in `offer` status whose updated_at falls in [fromMs, toMs). */
export function countOffersInRange(
  items: { status: string; updated_at: string }[],
  fromMs: number,
  toMs: number,
) {
  return items.filter(a => {
    if (a.status !== 'offer') return false
    const t = new Date(a.updated_at).getTime()
    return t >= fromMs && t < toMs
  }).length
}

export function offerStageTwoWeekTrend(
  items: { status: string; updated_at: string }[],
  now = new Date(),
) {
  const end = now.getTime()
  const w = 7 * 24 * 60 * 60 * 1000
  return {
    last: countOffersInRange(items, end - w, end),
    prev: countOffersInRange(items, end - 2 * w, end - w),
  }
}

export function countScheduledInterviewsInRange<T extends { scheduled_at: string | null; created_at: string }>(
  rows: T[],
  fromMs: number,
  toMs: number,
) {
  return rows.filter(r => {
    const t = r.scheduled_at ? new Date(r.scheduled_at).getTime() : new Date(r.created_at).getTime()
    return t >= fromMs && t < toMs
  }).length
}

export function interviewScheduleTwoWeekTrend<
  T extends { scheduled_at: string | null; created_at: string },
>(rows: T[], now = new Date()) {
  const end = now.getTime()
  const w = 7 * 24 * 60 * 60 * 1000
  return {
    last: countScheduledInterviewsInRange(rows, end - w, end),
    prev: countScheduledInterviewsInRange(rows, end - 2 * w, end - w),
  }
}
