import type { Application } from '../api/applications'
import type { InterviewAssignmentRow } from '../api/interviews'
import type { Job } from '../api/jobs'

const DAY_MS = 86_400_000

export type TrendResult = {
  current: number
  previous: number
  /** Signed delta current - previous */
  delta: number
  /** Percent change vs previous when previous > 0; null if not meaningful */
  pct: number | null
  direction: 'up' | 'down' | 'flat'
}

export function comparePeriodTrend(current: number, previous: number): TrendResult {
  const delta = current - previous
  let pct: number | null = null
  if (previous > 0) {
    pct = Math.round(((current - previous) / previous) * 100)
  } else if (current > 0) {
    pct = 100
  } else {
    pct = null
  }

  let direction: TrendResult['direction'] = 'flat'
  if (delta > 0) direction = 'up'
  else if (delta < 0) direction = 'down'

  return { current, previous, delta, pct, direction }
}

function inRange(iso: string, start: Date, end: Date) {
  const t = new Date(iso).getTime()
  return t >= start.getTime() && t < end.getTime()
}

/** New applications created in [start, end). */
export function countApplicationsCreatedInRange(applications: Application[], start: Date, end: Date) {
  return applications.filter(a => inRange(a.created_at, start, end)).length
}

export function applicantCreationTrend(applications: Application[], now = new Date()): TrendResult {
  const end = now
  const mid = new Date(now.getTime() - 30 * DAY_MS)
  const start = new Date(now.getTime() - 60 * DAY_MS)
  const current = countApplicationsCreatedInRange(applications, mid, end)
  const previous = countApplicationsCreatedInRange(applications, start, mid)
  return comparePeriodTrend(current, previous)
}

export function jobsCreatedTrend(jobs: Job[], now = new Date()): TrendResult {
  const end = now
  const mid = new Date(now.getTime() - 30 * DAY_MS)
  const start = new Date(now.getTime() - 60 * DAY_MS)
  const current = jobs.filter(j => inRange(j.created_at, mid, end)).length
  const previous = jobs.filter(j => inRange(j.created_at, start, mid)).length
  return comparePeriodTrend(current, previous)
}

/** Interviews with scheduled_at in [start, end). */
export function countScheduledInterviewsInRange(rows: InterviewAssignmentRow[], start: Date, end: Date) {
  return rows.filter(r => r.scheduled_at && inRange(r.scheduled_at, start, end)).length
}

export function scheduledInterviewTrend(rows: InterviewAssignmentRow[], now = new Date()): TrendResult {
  const end = now
  const mid = new Date(now.getTime() - 30 * DAY_MS)
  const start = new Date(now.getTime() - 60 * DAY_MS)
  const current = countScheduledInterviewsInRange(rows, mid, end)
  const previous = countScheduledInterviewsInRange(rows, start, mid)
  return comparePeriodTrend(current, previous)
}

/** Applications in offer status with updated_at in range (proxy for offer activity). */
export function countOfferTouchesInRange(applications: Application[], start: Date, end: Date) {
  return applications.filter(
    a => a.status === 'offer' && a.updated_at && inRange(a.updated_at, start, end),
  ).length
}

export function offerActivityTrend(applications: Application[], now = new Date()): TrendResult {
  const end = now
  const mid = new Date(now.getTime() - 30 * DAY_MS)
  const start = new Date(now.getTime() - 60 * DAY_MS)
  const current = countOfferTouchesInRange(applications, mid, end)
  const previous = countOfferTouchesInRange(applications, start, mid)
  return comparePeriodTrend(current, previous)
}

export type ActivityKind = 'application' | 'interview'

export type ActivityItem = {
  id: string
  kind: ActivityKind
  title: string
  subtitle: string
  at: string
  href?: string
}

function formatStageLabel(value: string) {
  return value.replace(/_/g, ' ').replace(/\b\w/g, ch => ch.toUpperCase())
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
    items.push({
      id: `app-${app.id}`,
      kind: 'application',
      title: `Candidate added · ${app.candidate_name || app.candidate_email}`,
      subtitle: `${jobTitle} · ${formatStageLabel(app.status)}`,
      at: app.created_at,
    })
  }

  for (const row of interviews) {
    if (!row.scheduled_at) continue
    const cand =
      row.application?.candidate_name || row.application?.candidate_email || 'Candidate'
    const jobTitle = row.job?.title ?? `Job #${row.application?.job_id ?? '—'}`
    items.push({
      id: `int-${row.id}`,
      kind: 'interview',
      title: `Interview scheduled · ${cand}`,
      subtitle: `${jobTitle} · ${formatStageLabel(row.status)}`,
      at: row.scheduled_at,
    })
  }

  items.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
  return items.slice(0, limit)
}

export function applicantsPerJob(applications: Application[], jobs: Job[], topN = 10) {
  const counts = new Map<number, number>()
  for (const a of applications) {
    counts.set(a.job_id, (counts.get(a.job_id) ?? 0) + 1)
  }
  const rows = jobs.map(j => ({
    jobId: j.id,
    title: j.title,
    count: counts.get(j.id) ?? 0,
  }))
  rows.sort((a, b) => b.count - a.count)
  return rows.slice(0, topN)
}

const FUNNEL_STATUSES = ['applied', 'screening', 'interview', 'offer', 'hired'] as const

export function funnelCountsForApplications(applications: Application[]) {
  return FUNNEL_STATUSES.map(status => ({
    status,
    label: formatStageLabel(status),
    count: applications.filter(a => a.status === status).length,
  }))
}

export function dominantStageForJob(applications: Application[], jobId: number): string {
  const byStatus = applications.filter(a => a.job_id === jobId).reduce<Record<string, number>>((acc, a) => {
    acc[a.status] = (acc[a.status] ?? 0) + 1
    return acc
  }, {})
  let best = ''
  let bestN = 0
  for (const [k, n] of Object.entries(byStatus)) {
    if (n > bestN) {
      best = k
      bestN = n
    }
  }
  return best ? formatStageLabel(best) : '—'
}
