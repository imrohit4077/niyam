import type { Application } from '../../api/applications'
import type { InterviewAssignmentRow } from '../../api/interviews'
import type { Job } from '../../api/jobs'

export const FUNNEL_STATUSES = ['applied', 'screening', 'interview', 'offer', 'hired'] as const
export type FunnelStage = (typeof FUNNEL_STATUSES)[number]

export const FUNNEL_LABELS: Record<FunnelStage, string> = {
  applied: 'Applied',
  screening: 'Screening',
  interview: 'Interview',
  offer: 'Offer',
  hired: 'Hired',
}

export function countByStatus(applications: Application[], statuses: readonly string[]): Record<string, number> {
  const acc: Record<string, number> = {}
  for (const s of statuses) acc[s] = 0
  for (const app of applications) {
    if (acc[app.status] !== undefined) acc[app.status] += 1
  }
  return acc
}

export function funnelCountsForApplications(applications: Application[]): number[] {
  const by = countByStatus(applications, FUNNEL_STATUSES)
  return FUNNEL_STATUSES.map(s => by[s] ?? 0)
}

export function applicantsPerJob(jobs: Job[], applications: Application[]): { job: Job; count: number }[] {
  const counts = new Map<number, number>()
  for (const j of jobs) counts.set(j.id, 0)
  for (const app of applications) {
    counts.set(app.job_id, (counts.get(app.job_id) ?? 0) + 1)
  }
  return jobs.map(job => ({ job, count: counts.get(job.id) ?? 0 }))
}

export type TrendPoint = { label: string; value: number }

export function pctChangeVsPrevious(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? null : null
  return Math.round(((current - previous) / previous) * 100)
}

export function formatTrendPercent(pct: number | null, current: number, previous: number): string {
  if (pct === null) {
    if (previous === 0 && current > 0) return 'new'
    if (previous === 0 && current === 0) return '—'
    return '—'
  }
  return `${pct > 0 ? '+' : ''}${pct}%`
}

/** Count rows whose ISO date string falls in the given calendar month (0–11). */
export function countInMonth<T>(rows: T[], getIso: (row: T) => string | null | undefined, year: number, monthIndex: number): number {
  const start = new Date(year, monthIndex, 1).getTime()
  const end = new Date(year, monthIndex + 1, 1).getTime()
  let n = 0
  for (const row of rows) {
    const raw = getIso(row)
    if (!raw) continue
    const t = new Date(raw).getTime()
    if (t >= start && t < end) n += 1
  }
  return n
}

export type ActivityKind = 'application' | 'interview' | 'offer' | 'hire' | 'rejection'

export type ActivityFeedItem = {
  id: string
  kind: ActivityKind
  title: string
  subtitle: string
  at: string
}

function kindForApplicationStatus(status: string): ActivityKind {
  if (status === 'hired') return 'hire'
  if (status === 'offer') return 'offer'
  if (status === 'rejected' || status === 'withdrawn') return 'rejection'
  return 'application'
}

export function buildActivityFeed(
  applications: Application[],
  interviews: InterviewAssignmentRow[],
  jobsById: Map<number, Job>,
  limit = 12,
): ActivityFeedItem[] {
  const items: ActivityFeedItem[] = []

  for (const app of applications) {
    const jobTitle = jobsById.get(app.job_id)?.title ?? `Job #${app.job_id}`
    const name = app.candidate_name || app.candidate_email
    const kind = kindForApplicationStatus(app.status)
    let title = ''
    if (kind === 'hire') title = `${name} marked hired`
    else if (kind === 'offer') title = `Offer stage: ${name}`
    else if (kind === 'rejection') title = `${name} closed (${app.status})`
    else title = `Candidate added: ${name}`
    items.push({
      id: `app-${app.id}-${app.updated_at}`,
      kind,
      title,
      subtitle: jobTitle,
      at: app.updated_at,
    })
  }

  for (const row of interviews) {
    const name = row.application?.candidate_name || row.application?.candidate_email || 'Candidate'
    const jobTitle = row.job?.title ?? (row.application?.job_id ? jobsById.get(row.application.job_id)?.title : null) ?? 'Interview'
    const scheduled = row.scheduled_at
    items.push({
      id: `int-${row.id}-${row.updated_at}`,
      kind: 'interview',
      title: scheduled ? `Interview scheduled: ${name}` : `Interview updated: ${name}`,
      subtitle: jobTitle,
      at: scheduled || row.updated_at,
    })
  }

  items.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
  return items.slice(0, limit)
}
