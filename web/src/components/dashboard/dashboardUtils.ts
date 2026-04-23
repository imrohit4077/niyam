import type { Application } from '../../api/applications'
import type { InterviewAssignmentRow } from '../../api/interviews'
import type { Job } from '../../api/jobs'

export const FUNNEL_STAGES = ['applied', 'screening', 'interview', 'offer', 'hired'] as const
export type FunnelStage = (typeof FUNNEL_STAGES)[number]

export function formatDashboardLabel(value: string) {
  return value.replace(/_/g, ' ').replace(/\b\w/g, ch => ch.toUpperCase())
}

export function startOfDay(d: Date) {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

/** Count items whose timestamp falls in [start, end). */
export function countInDateRange(
  items: { at: string }[],
  start: Date,
  end: Date,
) {
  const t0 = start.getTime()
  const t1 = end.getTime()
  return items.filter(({ at }) => {
    const t = new Date(at).getTime()
    return t >= t0 && t < t1
  }).length
}

export type TrendDirection = 'up' | 'down' | 'flat'

export function trendFromCounts(current: number, previous: number): { direction: TrendDirection; pct: number | null } {
  if (previous === 0 && current === 0) return { direction: 'flat', pct: null }
  if (previous === 0) return { direction: 'up', pct: null }
  const raw = ((current - previous) / previous) * 100
  const pct = Math.round(Math.abs(raw))
  if (raw > 0.5) return { direction: 'up', pct }
  if (raw < -0.5) return { direction: 'down', pct }
  return { direction: 'flat', pct: 0 }
}

export function formatTrendLabel(direction: TrendDirection, pct: number | null, vsLabel: string) {
  const arrow = direction === 'up' ? '↑' : direction === 'down' ? '↓' : '→'
  if (pct == null) {
    if (direction === 'flat') return `${arrow} vs ${vsLabel}`
    return `${arrow} vs ${vsLabel}`
  }
  if (direction === 'flat') return `${arrow} 0% vs ${vsLabel}`
  return `${arrow} ${pct}% vs ${vsLabel}`
}

export function dominantFunnelStage(counts: Record<string, number>): string {
  for (let i = FUNNEL_STAGES.length - 1; i >= 0; i--) {
    const s = FUNNEL_STAGES[i]
    if ((counts[s] ?? 0) > 0) return s
  }
  const keys = Object.keys(counts).filter(k => (counts[k] ?? 0) > 0)
  if (keys.length === 0) return '—'
  return keys.sort((a, b) => (counts[b] ?? 0) - (counts[a] ?? 0))[0]
}

export type ActivityKind = 'application' | 'interview' | 'offer'

export type ActivityFeedItem = {
  id: string
  kind: ActivityKind
  title: string
  subtitle: string
  at: string
}

export function buildActivityFeed(params: {
  applications: Application[]
  interviews: InterviewAssignmentRow[]
  jobs: Job[]
  limit?: number
}): ActivityFeedItem[] {
  const { applications, interviews, jobs, limit = 18 } = params
  const jobTitle = (jobId: number) => jobs.find(j => j.id === jobId)?.title ?? `Job #${jobId}`

  const fromApps: ActivityFeedItem[] = applications.map(a => ({
    id: `app-${a.id}`,
    kind: 'application' as const,
    title:
      a.status === 'offer'
        ? `Offer stage · ${a.candidate_name || a.candidate_email}`
        : `New applicant · ${a.candidate_name || a.candidate_email}`,
    subtitle: `${formatDashboardLabel(a.status)} · ${jobTitle(a.job_id)}`,
    at: a.status === 'offer' ? a.updated_at : a.created_at,
  }))

  const fromInterviews: ActivityFeedItem[] = interviews.map(row => ({
    id: `int-${row.id}`,
    kind: 'interview' as const,
    title: `Interview ${formatDashboardLabel(row.status)}`,
    subtitle: `${row.application?.candidate_name || row.application?.candidate_email || 'Candidate'} · ${row.job?.title ?? 'Role'}`,
    at: row.scheduled_at || row.updated_at,
  }))

  const merged = [...fromApps, ...fromInterviews].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
  return merged.slice(0, limit)
}
