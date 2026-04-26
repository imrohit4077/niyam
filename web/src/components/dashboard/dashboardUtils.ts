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

export type DashboardSlice = {
  key: string
  label: string
  value: number
  color: string
}

export function formatDashboardLabel(value: string) {
  return value.replace(/_/g, ' ').replace(/\b\w/g, ch => ch.toUpperCase())
}

export function makeDashboardSlices(entries: Array<[string, number]>): DashboardSlice[] {
  return entries
    .filter(([, value]) => value > 0)
    .map(([label, value], index) => ({
      key: label,
      label: formatDashboardLabel(label),
      value,
      color: DASHBOARD_CHART_COLORS[index % DASHBOARD_CHART_COLORS.length],
    }))
}

/** Ordered funnel stages for pipeline visualization */
export const FUNNEL_STAGES = ['applied', 'screening', 'interview', 'offer', 'hired'] as const

export function funnelCountsFromApplications(applications: Application[]): number[] {
  const byStatus = applications.reduce<Record<string, number>>((acc, a) => {
    acc[a.status] = (acc[a.status] ?? 0) + 1
    return acc
  }, {})
  return FUNNEL_STAGES.map(stage => byStatus[stage] ?? 0)
}

export function countApplicationsCreatedBetween(
  applications: Application[],
  startMs: number,
  endMs: number,
): number {
  return applications.filter(a => {
    const t = new Date(a.created_at).getTime()
    return t >= startMs && t < endMs
  }).length
}

export function countJobsCreatedBetween(jobs: Job[], startMs: number, endMs: number): number {
  return jobs.filter(j => {
    const t = new Date(j.created_at).getTime()
    return t >= startMs && t < endMs
  }).length
}

export function countOpenJobsCreatedBetween(jobs: Job[], startMs: number, endMs: number): number {
  return jobs.filter(j => {
    if (j.status !== 'open') return false
    const t = new Date(j.created_at).getTime()
    return t >= startMs && t < endMs
  }).length
}

export function countInterviewsScheduledBetween(
  rows: InterviewAssignmentRow[],
  startMs: number,
  endMs: number,
): number {
  return rows.filter(r => {
    if (!r.scheduled_at) return false
    const t = new Date(r.scheduled_at).getTime()
    return t >= startMs && t < endMs
  }).length
}

/** Applications currently in offer, with updated_at in range (proxy for offers touched in period). */
export function countOfferApplicationsUpdatedBetween(
  applications: Application[],
  startMs: number,
  endMs: number,
): number {
  return applications.filter(a => {
    if (a.status !== 'offer') return false
    const t = new Date(a.updated_at).getTime()
    return t >= startMs && t < endMs
  }).length
}

export type TrendParts = { arrow: '↑' | '↓' | '→'; label: string; positive: boolean }

export function rollingTrend(current: number, previous: number): TrendParts {
  if (previous === 0 && current === 0) {
    return { arrow: '→', label: '0%', positive: true }
  }
  if (previous === 0 && current > 0) {
    return { arrow: '↑', label: 'New', positive: true }
  }
  const pct = Math.round(((current - previous) / previous) * 100)
  if (pct === 0) return { arrow: '→', label: '0%', positive: true }
  if (pct > 0) return { arrow: '↑', label: `${pct}%`, positive: true }
  return { arrow: '↓', label: `${Math.abs(pct)}%`, positive: false }
}

export type ActivityItem = {
  id: string
  kind: 'application' | 'interview'
  title: string
  subtitle: string
  at: string
}

export function buildActivityFeed(
  applications: Application[],
  interviews: InterviewAssignmentRow[],
  jobsById: Map<number, Job>,
  limit = 14,
): ActivityItem[] {
  const appItems: ActivityItem[] = applications.map(a => {
    const job = jobsById.get(a.job_id)
    return {
      id: `app-${a.id}`,
      kind: 'application' as const,
      title: `Application · ${formatDashboardLabel(a.status)}`,
      subtitle: `${a.candidate_name || a.candidate_email} · ${job?.title ?? 'Job'}`,
      at: a.updated_at || a.created_at,
    }
  })
  const intItems: ActivityItem[] = interviews.map(r => {
    const name = r.application?.candidate_name || r.application?.candidate_email || 'Candidate'
    const jobTitle = r.job?.title ?? (r.application?.job_id ? jobsById.get(r.application.job_id)?.title : null) ?? 'Job'
    return {
      id: `int-${r.id}`,
      kind: 'interview' as const,
      title: `Interview · ${formatDashboardLabel(r.status)}`,
      subtitle: `${name} · ${jobTitle}`,
      at: r.scheduled_at || r.updated_at || r.created_at,
    }
  })
  return [...appItems, ...intItems]
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .slice(0, limit)
}

export function applicantsPerJob(applications: Application[]): Map<number, number> {
  const m = new Map<number, number>()
  for (const a of applications) {
    m.set(a.job_id, (m.get(a.job_id) ?? 0) + 1)
  }
  return m
}

export function statusHistogramForJob(applications: Application[], jobId: number): Record<string, number> {
  return applications
    .filter(a => a.job_id === jobId)
    .reduce<Record<string, number>>((acc, a) => {
      acc[a.status] = (acc[a.status] ?? 0) + 1
      return acc
    }, {})
}

const STAGE_PRIORITY = ['hired', 'offer', 'interview', 'screening', 'applied'] as const

/** Latest activity timestamp from loaded entities — used as a stable "as of" anchor for dashboard windows (no wall-clock in render). */
export function latestEntityTimestampMs(
  applications: Application[],
  jobs: Job[],
  interviews: InterviewAssignmentRow[],
): number | null {
  let max = 0
  for (const a of applications) {
    max = Math.max(max, new Date(a.updated_at).getTime(), new Date(a.created_at).getTime())
  }
  for (const j of jobs) {
    max = Math.max(max, new Date(j.updated_at).getTime(), new Date(j.created_at).getTime())
  }
  for (const r of interviews) {
    max = Math.max(max, new Date(r.updated_at).getTime(), new Date(r.created_at).getTime())
    if (r.scheduled_at) max = Math.max(max, new Date(r.scheduled_at).getTime())
  }
  return max > 0 ? max : null
}

export function dominantPipelineStage(counts: Record<string, number>): string {
  let best: string | null = null
  let bestN = 0
  for (const s of STAGE_PRIORITY) {
    const n = counts[s] ?? 0
    if (n > bestN) {
      best = s
      bestN = n
    }
  }
  if (best) return formatDashboardLabel(best)
  const fallback = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]
  return fallback ? formatDashboardLabel(fallback[0]) : '—'
}
