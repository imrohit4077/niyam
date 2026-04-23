import type { Application } from '../../api/applications'
import type { InterviewAssignmentRow } from '../../api/interviews'
import type { Job } from '../../api/jobs'

export const DASHBOARD_CHART_COLORS = [
  '#00b4d8',
  '#3b82f6',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#6b7280',
  '#8b5cf6',
]

export const PIPELINE_FUNNEL_STEPS = [
  { key: 'applied', label: 'Applied' },
  { key: 'screening', label: 'Screening' },
  { key: 'interview', label: 'Interview' },
  { key: 'offer', label: 'Offer' },
  { key: 'hired', label: 'Hired' },
] as const

export type DashboardSlice = {
  key: string
  label: string
  value: number
  color: string
}

export function formatDashboardLabel(value: string) {
  return value.replace(/_/g, ' ').replace(/\b\w/g, ch => ch.toUpperCase())
}

export function makeDashboardSlices(entries: Array<[string, number]>) {
  return entries
    .filter(([, value]) => value > 0)
    .map(([label, value], index) => ({
      key: label,
      label: formatDashboardLabel(label),
      value,
      color: DASHBOARD_CHART_COLORS[index % DASHBOARD_CHART_COLORS.length],
    }))
}

/** Inclusive start, exclusive end (UTC-safe for day buckets). */
export function countApplicationsCreatedBetween(
  applications: Application[],
  startMs: number,
  endMs: number,
): number {
  return applications.reduce((acc, app) => {
    const t = new Date(app.created_at).getTime()
    if (t >= startMs && t < endMs) return acc + 1
    return acc
  }, 0)
}

/** Applications created in the window for jobs that are currently open (proxy for active-role demand). */
export function countApplicationsToOpenJobsBetween(
  applications: Application[],
  jobs: Job[],
  startMs: number,
  endMs: number,
): number {
  const openJobIds = new Set(jobs.filter(j => j.status === 'open').map(j => j.id))
  return applications.reduce((acc, app) => {
    if (!openJobIds.has(app.job_id)) return acc
    const t = new Date(app.created_at).getTime()
    if (t >= startMs && t < endMs) return acc + 1
    return acc
  }, 0)
}

export function countInterviewsScheduledBetween(
  rows: InterviewAssignmentRow[],
  startMs: number,
  endMs: number,
): number {
  return rows.reduce((acc, row) => {
    if (!row.scheduled_at) return acc
    const t = new Date(row.scheduled_at).getTime()
    if (t >= startMs && t < endMs) return acc + 1
    return acc
  }, 0)
}

export function countOffersTouchedBetween(
  applications: Application[],
  startMs: number,
  endMs: number,
): number {
  return applications.reduce((acc, app) => {
    if (app.status !== 'offer') return acc
    const t = new Date(app.updated_at).getTime()
    if (t >= startMs && t < endMs) return acc + 1
    return acc
  }, 0)
}

export type TrendResult = {
  current: number
  previous: number
  pct: number
  direction: 'up' | 'down' | 'flat'
}

export function computeTrend(current: number, previous: number): TrendResult {
  if (previous === 0 && current === 0) {
    return { current, previous, pct: 0, direction: 'flat' }
  }
  if (previous === 0) {
    return { current, previous, pct: 100, direction: 'up' }
  }
  const raw = ((current - previous) / previous) * 100
  const pct = Math.round(Math.abs(raw))
  const direction: TrendResult['direction'] = raw > 0.5 ? 'up' : raw < -0.5 ? 'down' : 'flat'
  return { current, previous, pct, direction }
}

export function formatTrendLabel(t: TrendResult): string {
  if (t.direction === 'flat') return '0%'
  const sign = t.direction === 'up' ? '↑' : '↓'
  return `${sign} ${t.pct}%`
}

export type ActivityKind = 'application' | 'interview' | 'hire' | 'offer'

export type ActivityItem = {
  id: string
  kind: ActivityKind
  title: string
  subtitle: string
  at: number
}

export function formatDateTimeShort(value: string | null) {
  if (!value) return 'Not scheduled'
  return new Date(value).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function buildActivityFeed(
  applications: Application[],
  interviews: InterviewAssignmentRow[],
  jobsById: Map<number, Job>,
  limit = 14,
): ActivityItem[] {
  const items: ActivityItem[] = []

  for (const app of applications) {
    const job = jobsById.get(app.job_id)
    const jobTitle = job?.title ?? `Job #${app.job_id}`
    const name = app.candidate_name || app.candidate_email
    const created = new Date(app.created_at).getTime()
    const updated = new Date(app.updated_at).getTime()

    items.push({
      id: `app-applied-${app.id}`,
      kind: 'application',
      title: `Candidate applied · ${name}`,
      subtitle: jobTitle,
      at: created,
    })

    const history = app.stage_history ?? []
    if (history.length > 1) {
      const last = history[history.length - 1]
      if (last?.changed_at) {
        const lastAt = new Date(last.changed_at).getTime()
        if (lastAt > created + 1000) {
          items.push({
            id: `app-stage-${app.id}-${lastAt}`,
            kind: 'application',
            title: `Pipeline · ${name} → ${formatDashboardLabel(last.stage)}`,
            subtitle: jobTitle,
            at: lastAt,
          })
        }
      }
    }

    if (app.status === 'hired') {
      items.push({
        id: `app-hired-${app.id}`,
        kind: 'hire',
        title: `Hired · ${name}`,
        subtitle: jobTitle,
        at: updated,
      })
    } else if (app.status === 'offer') {
      items.push({
        id: `app-offer-${app.id}`,
        kind: 'offer',
        title: `In offer stage · ${name}`,
        subtitle: jobTitle,
        at: updated,
      })
    }
  }

  for (const row of interviews) {
    if (!row.scheduled_at) continue
    const name = row.application?.candidate_name || row.application?.candidate_email || 'Candidate'
    const jobTitle = row.job?.title ?? `Job #${row.application?.job_id ?? '—'}`
    items.push({
      id: `int-${row.id}`,
      kind: 'interview',
      title: `Interview scheduled · ${name}`,
      subtitle: `${jobTitle} · ${formatDateTimeShort(row.scheduled_at)}`,
      at: new Date(row.scheduled_at).getTime(),
    })
  }

  items.sort((a, b) => b.at - a.at)
  const deduped: ActivityItem[] = []
  const seen = new Set<string>()
  for (const it of items) {
    if (seen.has(it.id)) continue
    seen.add(it.id)
    deduped.push(it)
    if (deduped.length >= limit) break
  }
  return deduped
}
