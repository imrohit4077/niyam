import type { Application } from '../../api/applications'
import type { InterviewAssignmentRow } from '../../api/interviews'
import type { Job } from '../../api/jobs'

export type TrendDirection = 'up' | 'down' | 'flat'

export type PeriodTrend = {
  direction: TrendDirection
  pctLabel: string
  subtitle: string
}

const MS_DAY = 86_400_000

export function formatDashboardLabel(value: string) {
  return value.replace(/_/g, ' ').replace(/\b\w/g, ch => ch.toUpperCase())
}

export function periodTrend(current: number, previous: number, noun: string): PeriodTrend {
  if (previous === 0 && current === 0) {
    return { direction: 'flat', pctLabel: '0%', subtitle: `vs prior 30d ${noun}` }
  }
  if (previous === 0) {
    return { direction: 'up', pctLabel: '+100%', subtitle: `vs prior 30d ${noun}` }
  }
  const raw = Math.round(((current - previous) / previous) * 100)
  const capped = Math.min(999, Math.abs(raw))
  const sign = raw > 0 ? '+' : raw < 0 ? '−' : ''
  const direction: TrendDirection = raw > 0 ? 'up' : raw < 0 ? 'down' : 'flat'
  return {
    direction,
    pctLabel: raw === 0 ? '0%' : `${sign}${capped}%`,
    subtitle: `vs prior 30d ${noun}`,
  }
}

export function last30dBounds() {
  const end = new Date()
  const start = new Date(end.getTime() - 30 * MS_DAY)
  const prevEnd = new Date(start.getTime())
  const prevStart = new Date(prevEnd.getTime() - 30 * MS_DAY)
  return { start, end, prevStart, prevEnd }
}

function inRange(iso: string, start: Date, end: Date) {
  const t = new Date(iso).getTime()
  return t >= start.getTime() && t < end.getTime()
}

export function countApplicationsCreatedInRange(applications: Application[], start: Date, end: Date) {
  return applications.filter(a => inRange(a.created_at, start, end)).length
}

export function countJobsCreatedInRange(jobList: Job[], start: Date, end: Date) {
  return jobList.filter(j => inRange(j.created_at, start, end)).length
}

export function countInterviewsInRange(rows: InterviewAssignmentRow[], start: Date, end: Date) {
  return rows.filter(row => {
    const anchor = row.scheduled_at ?? row.created_at
    return anchor ? inRange(anchor, start, end) : false
  }).length
}

/** Applications that were updated into offer status within the window (best-effort signal). */
export function countOfferTouchesInRange(applications: Application[], start: Date, end: Date) {
  return applications.filter(a => a.status === 'offer' && inRange(a.updated_at, start, end)).length
}

export const FUNNEL_STATUSES = ['applied', 'screening', 'interview', 'offer', 'hired'] as const

export type FunnelStage = (typeof FUNNEL_STATUSES)[number]

export function funnelCountsFromApplications(applications: Application[]) {
  const counts: Record<FunnelStage, number> = {
    applied: 0,
    screening: 0,
    interview: 0,
    offer: 0,
    hired: 0,
  }
  for (const app of applications) {
    const s = app.status as string
    if (s in counts) counts[s as FunnelStage] += 1
  }
  return FUNNEL_STATUSES.map(stage => ({ stage, label: formatDashboardLabel(stage), count: counts[stage] }))
}

export function applicantsPerJob(applications: Application[], jobList: Job[], limit = 10) {
  const byJob = applications.reduce<Record<number, number>>((acc, app) => {
    acc[app.job_id] = (acc[app.job_id] ?? 0) + 1
    return acc
  }, {})
  return jobList
    .map(job => ({ job, count: byJob[job.id] ?? 0 }))
    .filter(row => row.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, limit)
}

export function dominantApplicantStatusForJob(applications: Application[], jobId: number): string | null {
  const counts = applications
    .filter(a => a.job_id === jobId)
    .reduce<Record<string, number>>((acc, a) => {
      acc[a.status] = (acc[a.status] ?? 0) + 1
      return acc
    }, {})
  let best: string | null = null
  let max = 0
  for (const [status, n] of Object.entries(counts)) {
    if (n > max) {
      max = n
      best = status
    }
  }
  return best
}

export type ActivityKind = 'candidate' | 'interview' | 'offer'

export type ActivityItem = {
  id: string
  kind: ActivityKind
  at: string
  title: string
  detail: string
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
    items.push({
      id: `app-${app.id}-created`,
      kind: 'candidate',
      at: app.created_at,
      title: 'Candidate added',
      detail: `${name} · ${jobTitle}`,
    })
  }

  for (const row of interviews) {
    const jobTitle = row.job?.title ?? (row.application?.job_id ? jobsById.get(row.application.job_id)?.title : undefined) ?? 'Role'
    const name = row.application?.candidate_name || row.application?.candidate_email || 'Candidate'
    const anchor = row.scheduled_at ?? row.created_at
    items.push({
      id: `int-${row.id}`,
      kind: 'interview',
      at: anchor,
      title: row.scheduled_at ? 'Interview scheduled' : 'Interview activity',
      detail: `${name} · ${jobTitle}`,
    })
  }

  for (const app of applications) {
    if (app.status !== 'offer') continue
    const job = jobsById.get(app.job_id)
    const jobTitle = job?.title ?? `Job #${app.job_id}`
    const name = app.candidate_name || app.candidate_email
    items.push({
      id: `app-${app.id}-offer`,
      kind: 'offer',
      at: app.updated_at,
      title: 'Offer stage',
      detail: `${name} · ${jobTitle}`,
    })
  }

  items.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
  const seen = new Set<string>()
  const deduped: ActivityItem[] = []
  for (const row of items) {
    if (seen.has(row.id)) continue
    seen.add(row.id)
    deduped.push(row)
    if (deduped.length >= limit) break
  }
  return deduped
}
