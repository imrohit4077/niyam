import type { Application } from '../../api/applications'
import type { InterviewAssignmentRow } from '../../api/interviews'
import type { Job } from '../../api/jobs'

export type TrendDirection = 'up' | 'down' | 'flat'

export type PeriodTrend = {
  direction: TrendDirection
  percent: number
  label: string
}

const MS_DAY = 86_400_000

function clampPercent(n: number) {
  if (!Number.isFinite(n)) return 0
  return Math.min(999, Math.max(0, Math.round(n)))
}

/** Compare count in current window vs previous window of same length. */
export function periodTrend(current: number, previous: number): PeriodTrend {
  if (previous <= 0 && current <= 0) {
    return { direction: 'flat', percent: 0, label: '0%' }
  }
  if (previous <= 0 && current > 0) {
    return { direction: 'up', percent: 100, label: '+100%' }
  }
  const raw = ((current - previous) / previous) * 100
  const percent = clampPercent(Math.abs(raw))
  const direction: TrendDirection = raw > 0.5 ? 'up' : raw < -0.5 ? 'down' : 'flat'
  const sign = raw > 0 ? '+' : raw < 0 ? '−' : ''
  return {
    direction,
    percent,
    label: `${sign}${percent}%`,
  }
}

export function countApplicationsCreatedInRange(applications: Application[], start: Date, end: Date) {
  const a = start.getTime()
  const b = end.getTime()
  return applications.filter(app => {
    const t = new Date(app.created_at).getTime()
    return t >= a && t < b
  }).length
}

export function countOffersByUpdatedRange(applications: Application[], start: Date, end: Date) {
  const a = start.getTime()
  const b = end.getTime()
  return applications.filter(app => {
    if (app.status !== 'offer') return false
    const t = new Date(app.updated_at).getTime()
    return t >= a && t < b
  }).length
}

/** Interviews with a scheduled time in [start, end). */
export function countInterviewsScheduledInRange(rows: InterviewAssignmentRow[], start: Date, end: Date) {
  const a = start.getTime()
  const b = end.getTime()
  return rows.filter(row => {
    if (!row.scheduled_at) return false
    const t = new Date(row.scheduled_at).getTime()
    return t >= a && t < b
  }).length
}

export function workspaceTrendWindows(now = new Date()) {
  const end = now.getTime()
  const curStart = end - 30 * MS_DAY
  const prevStart = end - 60 * MS_DAY
  return {
    current: { start: new Date(curStart), end: new Date(end) },
    previous: { start: new Date(prevStart), end: new Date(curStart) },
  }
}

export const PIPELINE_FUNNEL_STAGES = [
  { key: 'applied', label: 'Applied' },
  { key: 'screening', label: 'Screening' },
  { key: 'interview', label: 'Interview' },
  { key: 'offer', label: 'Offer' },
  { key: 'hired', label: 'Hired' },
] as const

export function funnelCountsFromApplications(applications: Application[]) {
  const by = applications.reduce<Record<string, number>>((acc, app) => {
    acc[app.status] = (acc[app.status] ?? 0) + 1
    return acc
  }, {})
  return PIPELINE_FUNNEL_STAGES.map(stage => ({
    ...stage,
    value: by[stage.key] ?? 0,
  }))
}

export function applicantsPerJob(jobs: Job[], applications: Application[]) {
  const counts = applications.reduce<Record<number, number>>((acc, app) => {
    acc[app.job_id] = (acc[app.job_id] ?? 0) + 1
    return acc
  }, {})
  return jobs.map(job => ({
    job,
    count: counts[job.id] ?? 0,
  }))
}

export type ActivityKind = 'candidate' | 'stage' | 'interview'

export type ActivityFeedItem = {
  id: string
  kind: ActivityKind
  title: string
  subtitle: string
  at: string
}

function formatAppStatus(status: string) {
  return status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

export function buildActivityFeed(
  applications: Application[],
  interviews: InterviewAssignmentRow[],
  limit = 14,
): ActivityFeedItem[] {
  const items: ActivityFeedItem[] = []

  applications.forEach(app => {
    items.push({
      id: `app-created-${app.id}`,
      kind: 'candidate',
      title: `Candidate added: ${app.candidate_name || app.candidate_email}`,
      subtitle: `Applied · ${formatAppStatus(app.status)}`,
      at: app.created_at,
    })
    const history = app.stage_history ?? []
    history.forEach((entry, idx) => {
      items.push({
        id: `app-stage-${app.id}-${idx}-${entry.changed_at}`,
        kind: 'stage',
        title: `${app.candidate_name || app.candidate_email} → ${formatAppStatus(entry.stage)}`,
        subtitle: 'Stage update',
        at: entry.changed_at,
      })
    })
  })

  interviews.forEach(row => {
    if (!row.scheduled_at) return
    items.push({
      id: `int-${row.id}-${row.scheduled_at}`,
      kind: 'interview',
      title: `Interview scheduled: ${row.application?.candidate_name || row.application?.candidate_email || 'Candidate'}`,
      subtitle: row.job?.title ? row.job.title : 'Interview',
      at: row.scheduled_at,
    })
  })

  items.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())

  const seen = new Set<string>()
  const deduped: ActivityFeedItem[] = []
  for (const it of items) {
    const k = `${it.kind}|${it.title}|${it.at}`
    if (seen.has(k)) continue
    seen.add(k)
    deduped.push(it)
    if (deduped.length >= limit) break
  }
  return deduped
}
