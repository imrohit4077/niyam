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

export const PIPELINE_FUNNEL_STATUSES = ['applied', 'screening', 'interview', 'offer', 'hired'] as const

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

export function pctChange(previous: number, current: number): number {
  if (previous === 0) return current === 0 ? 0 : 100
  return Math.round(((current - previous) / previous) * 100)
}

export function uniqueCandidateCount(applications: Application[]) {
  return new Set(applications.map(a => a.candidate_email.toLowerCase())).size
}

export function countInCalendarMonth(rows: { created_at: string }[], year: number, monthIndex0: number) {
  return rows.filter(r => {
    const d = new Date(r.created_at)
    return d.getFullYear() === year && d.getMonth() === monthIndex0
  }).length
}

export function countJobsByCreatedMonth(jobs: Job[], year: number, monthIndex0: number) {
  return jobs.filter(j => {
    const d = new Date(j.created_at)
    return d.getFullYear() === year && d.getMonth() === monthIndex0
  }).length
}

export function countOffersByUpdatedMonth(applications: Application[], year: number, monthIndex0: number) {
  return applications.filter(a => {
    if (a.status !== 'offer') return false
    const d = new Date(a.updated_at)
    return d.getFullYear() === year && d.getMonth() === monthIndex0
  }).length
}

export function countInterviewsByCreatedMonth(rows: InterviewAssignmentRow[], year: number, monthIndex0: number) {
  return rows.filter(r => {
    const d = new Date(r.created_at)
    return d.getFullYear() === year && d.getMonth() === monthIndex0
  }).length
}

export type ActivityKind = 'application' | 'interview' | 'job'

export type ActivityFeedItem = {
  id: string
  kind: ActivityKind
  label: string
  sub: string
  at: string
}

export function buildActivityFeed(
  applications: Application[],
  interviews: InterviewAssignmentRow[],
  jobs: Job[],
  jobTitleById: Map<number, string>,
  limit = 12,
): ActivityFeedItem[] {
  const items: ActivityFeedItem[] = []

  for (const a of applications) {
    const title = jobTitleById.get(a.job_id) ?? `Job #${a.job_id}`
    items.push({
      id: `app-${a.id}`,
      kind: 'application',
      label: `Application: ${a.candidate_name || a.candidate_email}`,
      sub: `Applied to ${title}`,
      at: a.created_at,
    })
  }

  for (const row of interviews) {
    const name = row.application?.candidate_name || row.application?.candidate_email || 'Candidate'
    const jt = row.job?.title ?? (row.application?.job_id != null ? jobTitleById.get(row.application.job_id) : undefined) ?? 'Role'
    items.push({
      id: `int-${row.id}`,
      kind: 'interview',
      label: `Interview: ${name}`,
      sub: row.scheduled_at ? `Scheduled · ${jt}` : `Updated · ${jt}`,
      at: row.scheduled_at || row.updated_at,
    })
  }

  for (const job of jobs) {
    items.push({
      id: `job-${job.id}`,
      kind: 'job',
      label: `Job ${job.status === 'open' ? 'opened' : 'updated'}: ${job.title}`,
      sub: formatDashboardLabel(job.status),
      at: job.updated_at,
    })
  }

  items.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
  return items.slice(0, limit)
}

export function dominantApplicantStageForJob(applications: Application[], jobId: number): string {
  const counts: Record<string, number> = {}
  for (const a of applications) {
    if (a.job_id !== jobId) continue
    counts[a.status] = (counts[a.status] ?? 0) + 1
  }
  let best = ''
  let bestN = 0
  for (const [k, v] of Object.entries(counts)) {
    if (v > bestN) {
      best = k
      bestN = v
    }
  }
  return best || '—'
}
