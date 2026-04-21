/** Shared helpers for the home dashboard (pure functions). */

export function formatDashboardLabel(value: string) {
  return value.replace(/_/g, ' ').replace(/\b\w/g, ch => ch.toUpperCase())
}

export type TrendResult = {
  /** Arrow character or neutral dash */
  symbol: string
  /** Signed percentage change, e.g. 12 or -5 */
  percent: number | null
  /** Short copy for screen readers / tooltip */
  hint: string
}

/**
 * Percent change from `previous` to `current`.
 * When previous is 0, returns null percent and a qualitative hint.
 */
export function trendFromCounts(current: number, previous: number): TrendResult {
  if (previous === 0 && current === 0) {
    return { symbol: '—', percent: 0, hint: 'No change vs prior period' }
  }
  if (previous === 0) {
    return { symbol: '↑', percent: null, hint: 'New activity vs prior period' }
  }
  const raw = ((current - previous) / previous) * 100
  const rounded = Math.round(raw)
  const symbol = rounded > 0 ? '↑' : rounded < 0 ? '↓' : '—'
  return {
    symbol,
    percent: rounded,
    hint: `${rounded >= 0 ? '+' : ''}${rounded}% vs prior period`,
  }
}

export function trendLabel(t: TrendResult): string {
  if (t.percent === null) return `${t.symbol} new`
  if (t.percent === 0 && t.symbol === '—') return '— 0%'
  return `${t.symbol} ${Math.abs(t.percent)}%`
}

type TrendBundle = {
  candidates: TrendResult
  jobs: TrendResult
  interviews: TrendResult
  offers: TrendResult
}

function countInRange<T>(items: readonly T[], getTime: (item: T) => number | null, start: number, end: number): number {
  return items.filter(item => {
    const t = getTime(item)
    if (t == null) return false
    return t >= start && t < end
  }).length
}

/** Rolling 30-day windows vs prior 30 days; safe to call from `useEffect`. */
export function computeDashboardTrends(
  allApplications: { created_at: string; status: string; updated_at: string }[],
  interviews: { status: string; scheduled_at: string | null }[],
  jobs: { status: string; created_at: string }[],
): TrendBundle {
  const periodMs = 30 * 24 * 60 * 60 * 1000
  const now = Date.now()
  const curStart = now - periodMs
  const prevStart = now - 2 * periodMs
  const prevEnd = curStart

  const applicationsCreatedCurrent = countInRange(
    allApplications,
    a => new Date(a.created_at).getTime(),
    curStart,
    now + 1,
  )
  const applicationsCreatedPrevious = countInRange(
    allApplications,
    a => new Date(a.created_at).getTime(),
    prevStart,
    prevEnd,
  )

  const jobsCreatedCurrent = countInRange(jobs, j => new Date(j.created_at).getTime(), curStart, now + 1)
  const jobsCreatedPrevious = countInRange(jobs, j => new Date(j.created_at).getTime(), prevStart, prevEnd)

  const interviewAssignments = interviews.filter(
    row => row.status === 'scheduled' || row.status === 'pending' || !!row.scheduled_at,
  )
  const interviewsScheduledCurrent = countInRange(
    interviewAssignments,
    row => (row.scheduled_at ? new Date(row.scheduled_at).getTime() : null),
    curStart,
    now + 1,
  )
  const interviewsScheduledPrevious = countInRange(
    interviewAssignments,
    row => (row.scheduled_at ? new Date(row.scheduled_at).getTime() : null),
    prevStart,
    prevEnd,
  )

  const offerApps = allApplications.filter(a => a.status === 'offer')
  const offersCurrent = countInRange(offerApps, a => new Date(a.updated_at).getTime(), curStart, now + 1)
  const offersPrevious = countInRange(offerApps, a => new Date(a.updated_at).getTime(), prevStart, prevEnd)

  return {
    candidates: trendFromCounts(applicationsCreatedCurrent, applicationsCreatedPrevious),
    jobs: trendFromCounts(jobsCreatedCurrent, jobsCreatedPrevious),
    interviews: trendFromCounts(interviewsScheduledCurrent, interviewsScheduledPrevious),
    offers: trendFromCounts(offersCurrent, offersPrevious),
  }
}
