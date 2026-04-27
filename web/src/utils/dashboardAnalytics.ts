/** Pure helpers for homepage dashboard aggregations (no React). */

export type MonthBucket = { key: string; label: string }

export function rollingMonthKeys(count: number, ref = new Date()): MonthBucket[] {
  return Array.from({ length: count }, (_, idx) => {
    const date = new Date(ref.getFullYear(), ref.getMonth() - (count - 1 - idx), 1)
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    const label = date.toLocaleDateString('en-US', { month: 'short' })
    return { key, label }
  })
}

export function isInMonth(isoDate: string, yearMonthKey: string): boolean {
  const d = new Date(isoDate)
  const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  return key === yearMonthKey
}

export function countCreatedInMonth<T extends { created_at: string }>(
  rows: T[],
  yearMonthKey: string,
): number {
  return rows.filter(r => isInMonth(r.created_at, yearMonthKey)).length
}

export function countJobsCreatedInMonth<T extends { created_at: string }>(
  rows: T[],
  yearMonthKey: string,
): number {
  return rows.filter(j => isInMonth(j.created_at, yearMonthKey)).length
}

export function countInterviewSlotsInMonth<T extends { scheduled_at: string | null; created_at: string }>(
  rows: T[],
  yearMonthKey: string,
): number {
  return rows.filter(r => {
    const iso = r.scheduled_at || r.created_at
    return isInMonth(iso, yearMonthKey)
  }).length
}

export function countOffersByUpdatedMonth<T extends { status: string; updated_at: string }>(
  rows: T[],
  yearMonthKey: string,
): number {
  return rows.filter(a => a.status === 'offer' && isInMonth(a.updated_at, yearMonthKey)).length
}

export type TrendParts = {
  direction: 'up' | 'down' | 'flat'
  arrow: string
  pctLabel: string
  sublabel: string
}

/** Month-over-month percent change; handles zero previous month. */
export function monthOverMonthTrend(current: number, previous: number): TrendParts {
  if (previous === 0 && current === 0) {
    return { direction: 'flat', arrow: '→', pctLabel: '0%', sublabel: 'vs prior month' }
  }
  if (previous === 0) {
    return { direction: 'up', arrow: '↑', pctLabel: '—', sublabel: 'new vs prior month' }
  }
  const raw = ((current - previous) / previous) * 100
  const rounded = Math.round(raw)
  const direction = rounded > 0 ? 'up' : rounded < 0 ? 'down' : 'flat'
  const arrow = direction === 'up' ? '↑' : direction === 'down' ? '↓' : '→'
  const sign = rounded > 0 ? '+' : ''
  return {
    direction,
    arrow,
    pctLabel: `${sign}${rounded}%`,
    sublabel: 'vs prior month',
  }
}

const FUNNEL_STATUSES = ['applied', 'screening', 'interview', 'offer', 'hired'] as const

export function workspaceFunnelCounts<T extends { status: string }>(
  applications: T[],
): { key: string; label: string; count: number }[] {
  return FUNNEL_STATUSES.map(status => ({
    key: status,
    label: status.charAt(0).toUpperCase() + status.slice(1),
    count: applications.filter(a => a.status === status).length,
  }))
}

export function applicantsPerJob<T extends { job_id: number }>(
  applications: T[],
  topN: number,
): { jobId: number; count: number }[] {
  const map = new Map<number, number>()
  for (const a of applications) {
    map.set(a.job_id, (map.get(a.job_id) ?? 0) + 1)
  }
  return [...map.entries()]
    .map(([jobId, count]) => ({ jobId, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, topN)
}

export function sourceBreakdown<T extends { source_type: string }>(
  applications: T[],
): Record<string, number> {
  return applications.reduce<Record<string, number>>((acc, a) => {
    const s = a.source_type || 'unknown'
    acc[s] = (acc[s] ?? 0) + 1
    return acc
  }, {})
}

export type ActivityKind = 'application' | 'interview' | 'job'

export type ActivityItem = {
  id: string
  kind: ActivityKind
  title: string
  meta: string
  at: string
}

function formatLabel(value: string) {
  return value.replace(/_/g, ' ').replace(/\b\w/g, ch => ch.toUpperCase())
}

export function buildActivityFeed(params: {
  applications: { id: number; created_at: string; candidate_name: string | null; candidate_email: string; status: string; job_id: number }[]
  interviews: {
    id: number
    created_at: string
    scheduled_at: string | null
    status: string
    application?: { candidate_name?: string | null; candidate_email?: string | null; job_id?: number } | null
    job?: { title?: string | null } | null
  }[]
  jobs: { id: number; title: string; created_at: string; published_at: string | null }[]
  maxItems?: number
}): ActivityItem[] {
  const maxItems = params.maxItems ?? 14
  const items: ActivityItem[] = []

  for (const a of params.applications) {
    items.push({
      id: `app-${a.id}`,
      kind: 'application',
      title: `Candidate ${a.candidate_name?.trim() || a.candidate_email}`,
      meta: `Application · ${formatLabel(a.status)}`,
      at: a.created_at,
    })
  }

  for (const row of params.interviews) {
    const name =
      row.application?.candidate_name?.trim() ||
      row.application?.candidate_email ||
      'Interview'
    const jobTitle = row.job?.title ?? 'Role'
    items.push({
      id: `int-${row.id}`,
      kind: 'interview',
      title: name,
      meta: `${jobTitle} · ${formatLabel(row.status)}`,
      at: row.scheduled_at || row.created_at,
    })
  }

  for (const j of params.jobs) {
    items.push({
      id: `job-${j.id}`,
      kind: 'job',
      title: j.title,
      meta: j.published_at ? 'Job published' : 'Job created',
      at: j.published_at || j.created_at,
    })
  }

  items.sort((x, y) => new Date(y.at).getTime() - new Date(x.at).getTime())
  return items.slice(0, maxItems)
}

export function dominantApplicantStage<T extends { status: string }>(
  applications: T[],
): string | null {
  if (applications.length === 0) return null
  const counts = applications.reduce<Record<string, number>>((acc, a) => {
    acc[a.status] = (acc[a.status] ?? 0) + 1
    return acc
  }, {})
  let best = ''
  let n = 0
  for (const [k, v] of Object.entries(counts)) {
    if (v > n) {
      n = v
      best = k
    }
  }
  return best || null
}
