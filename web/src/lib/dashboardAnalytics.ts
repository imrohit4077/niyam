import type { Application } from '../api/applications'
import type { InterviewAssignmentRow } from '../api/interviews'
import type { Job } from '../api/jobs'

export const PIPELINE_FUNNEL_STATUSES = ['applied', 'screening', 'interview', 'offer', 'hired'] as const

export type PipelineFunnelStatus = (typeof PIPELINE_FUNNEL_STATUSES)[number]

export function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1)
}

export function addMonths(d: Date, delta: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + delta, 1)
}

export function isDateInRange(iso: string, start: Date, end: Date): boolean {
  const t = new Date(iso).getTime()
  return t >= start.getTime() && t < end.getTime()
}

/** Month-over-month percent change for a rate-style comparison (e.g. new events per month). */
export function monthOverMonthPercent(current: number, previous: number): number | null {
  if (previous === 0 && current === 0) return null
  if (previous === 0) return null
  return Math.round(((current - previous) / previous) * 100)
}

export type TrendDisplay = {
  direction: 'up' | 'down' | 'flat' | 'neutral'
  label: string
  /** For title="" accessibility */
  hint: string
}

export function formatTrendPct(pct: number | null, hint: string): TrendDisplay {
  if (pct === null) {
    return { direction: 'neutral', label: '—', hint }
  }
  if (pct === 0) {
    return { direction: 'flat', label: '0%', hint }
  }
  if (pct > 0) {
    return { direction: 'up', label: `↑ ${pct}%`, hint }
  }
  return { direction: 'down', label: `↓ ${Math.abs(pct)}%`, hint }
}

export function countApplicationsCreatedInMonth(applications: Application[], monthStart: Date): number {
  const next = addMonths(monthStart, 1)
  return applications.filter(a => isDateInRange(a.created_at, monthStart, next)).length
}

export function countJobsCreatedInMonth(jobs: Job[], monthStart: Date): number {
  const next = addMonths(monthStart, 1)
  return jobs.filter(j => isDateInRange(j.created_at, monthStart, next)).length
}

export function countInterviewsScheduledInMonth(rows: InterviewAssignmentRow[], monthStart: Date): number {
  const next = addMonths(monthStart, 1)
  return rows.filter(r => r.scheduled_at && isDateInRange(r.scheduled_at, monthStart, next)).length
}

/** Applications in offer status with updated_at in the month (proxy for offer activity). */
export function countOfferTouchesInMonth(applications: Application[], monthStart: Date): number {
  const next = addMonths(monthStart, 1)
  return applications.filter(
    a => a.status === 'offer' && a.updated_at && isDateInRange(a.updated_at, monthStart, next),
  ).length
}

export type ActivityKind = 'application' | 'interview' | 'offer' | 'hire'

export type ActivityFeedItem = {
  id: string
  kind: ActivityKind
  title: string
  subtitle: string
  at: string
  href?: string
}

export function buildActivityFeed(params: {
  applications: Application[]
  interviews: InterviewAssignmentRow[]
  accountId: string
  limit?: number
}): ActivityFeedItem[] {
  const { applications, interviews, accountId, limit = 14 } = params
  const items: ActivityFeedItem[] = []

  const recentApps = [...applications]
    .sort(
      (a, b) =>
        Math.max(new Date(b.updated_at).getTime(), new Date(b.created_at).getTime()) -
        Math.max(new Date(a.updated_at).getTime(), new Date(a.created_at).getTime()),
    )
    .slice(0, 100)

  const recentInterviews = [...interviews]
    .filter(r => !!r.scheduled_at)
    .sort((a, b) => new Date(b.scheduled_at!).getTime() - new Date(a.scheduled_at!).getTime())
    .slice(0, 40)

  for (const a of recentApps) {
    const base = `/account/${accountId}/jobs/${a.job_id}/edit`
    items.push({
      id: `app-created-${a.id}`,
      kind: 'application',
      title: 'New application',
      subtitle: `${a.candidate_name || a.candidate_email} applied`,
      at: a.created_at,
      href: base,
    })
    if (a.status === 'offer') {
      items.push({
        id: `app-offer-${a.id}`,
        kind: 'offer',
        title: 'Offer stage',
        subtitle: `${a.candidate_name || a.candidate_email}`,
        at: a.updated_at,
        href: base,
      })
    }
    if (a.status === 'hired') {
      items.push({
        id: `app-hire-${a.id}`,
        kind: 'hire',
        title: 'Candidate hired',
        subtitle: `${a.candidate_name || a.candidate_email}`,
        at: a.updated_at,
        href: base,
      })
    }
  }

  for (const row of recentInterviews) {
    const jobId = row.job?.id ?? row.application?.job_id
    if (!row.scheduled_at || !jobId) continue
    items.push({
      id: `int-${row.id}`,
      kind: 'interview',
      title: 'Interview scheduled',
      subtitle: `${row.application?.candidate_name || row.application?.candidate_email || 'Candidate'} · ${row.job?.title ?? 'Job'}`,
      at: row.scheduled_at,
      href: `/account/${accountId}/interviews`,
    })
  }

  return items
    .sort((x, y) => new Date(y.at).getTime() - new Date(x.at).getTime())
    .slice(0, limit)
}

export function aggregateApplicantsByJobId(applications: Application[]): Map<number, number> {
  const m = new Map<number, number>()
  for (const a of applications) {
    m.set(a.job_id, (m.get(a.job_id) ?? 0) + 1)
  }
  return m
}

export function dominantPipelineStage(
  applications: Application[],
  jobId: number,
): { stage: string; count: number } | null {
  const counts = new Map<string, number>()
  for (const a of applications) {
    if (a.job_id !== jobId) continue
    counts.set(a.status, (counts.get(a.status) ?? 0) + 1)
  }
  let best: { stage: string; count: number } | null = null
  for (const [stage, count] of counts) {
    if (!best || count > best.count) best = { stage, count }
  }
  return best
}
