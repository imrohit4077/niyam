import type { Application } from '../../api/applications'
import type { InterviewAssignmentRow } from '../../api/interviews'
import type { Job } from '../../api/jobs'
import type { SummaryTrend } from './DashboardSummaryCard'

export function countInDateRange(
  dates: Array<string | null | undefined>,
  start: Date,
  end: Date,
  pick: (d: Date) => boolean,
): number {
  const t0 = start.getTime()
  const t1 = end.getTime()
  let n = 0
  for (const raw of dates) {
    if (!raw) continue
    const d = new Date(raw)
    const t = d.getTime()
    if (Number.isNaN(t)) continue
    if (t >= t0 && t <= t1 && pick(d)) n += 1
  }
  return n
}

export function applicationsCreatedInRange(apps: Application[], start: Date, end: Date): number {
  return countInDateRange(
    apps.map(a => a.created_at),
    start,
    end,
    () => true,
  )
}

export function interviewsScheduledInRange(rows: InterviewAssignmentRow[], start: Date, end: Date): number {
  return countInDateRange(
    rows.map(r => r.scheduled_at),
    start,
    end,
    () => true,
  )
}

export function offersTouchedInRange(apps: Application[], start: Date, end: Date): number {
  return apps.filter(a => {
    if (a.status !== 'offer') return false
    const u = new Date(a.updated_at)
    return !Number.isNaN(u.getTime()) && u >= start && u < end
  }).length
}

export function trendFromCounts(current: number, previous: number): SummaryTrend {
  if (previous === 0 && current === 0) {
    return { label: 'No change in the last two periods', direction: 'flat', pctLabel: '—' }
  }
  if (previous === 0 && current > 0) {
    return { label: 'New activity vs prior period', direction: 'up', pctLabel: 'New' }
  }
  const delta = current - previous
  const pct = Math.round((delta / previous) * 100)
  const direction = delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat'
  const sign = pct > 0 ? '+' : ''
  return {
    label: `${sign}${pct}% vs prior 30 days`,
    direction,
    pctLabel: `${sign}${pct}%`,
  }
}

function inRangeInclusive(d: Date, start: Date, end: Date) {
  const t = d.getTime()
  return t >= start.getTime() && t <= end.getTime()
}

/** New job records created in the window (all statuses) — proxy for hiring momentum next to “active” count. */
export function jobsCreatedInRange(jobs: Job[], start: Date, end: Date): number {
  return jobs.filter(j => j.created_at && inRangeInclusive(new Date(j.created_at), start, end)).length
}

const FUNNEL_STATUSES = ['applied', 'screening', 'interview', 'offer', 'hired'] as const

export type FunnelDatum = { stage: string; label: string; count: number }

export function workspaceFunnelData(apps: Application[]): FunnelDatum[] {
  return FUNNEL_STATUSES.map(stage => ({
    stage,
    label: stage.charAt(0).toUpperCase() + stage.slice(1),
    count: apps.filter(a => a.status === stage).length,
  }))
}

export type ActivityItem = {
  id: string
  title: string
  meta: string
  at: string
}

export function buildWorkspaceActivityFeed(
  apps: Application[],
  interviews: InterviewAssignmentRow[],
  jobs: Job[],
  limit = 14,
): ActivityItem[] {
  const jobTitle = (jobId: number) => jobs.find(j => j.id === jobId)?.title ?? `Job #${jobId}`

  const fromApps: ActivityItem[] = apps.map(a => ({
    id: `app-${a.id}`,
    title: `Application: ${a.candidate_name?.trim() || a.candidate_email}`,
    meta: `${jobTitle(a.job_id)} · ${formatStatus(a.status)}`,
    at: a.created_at,
  }))

  const fromInterviews: ActivityItem[] = interviews.map(row => {
    const name = row.application?.candidate_name?.trim() || row.application?.candidate_email || 'Candidate'
    const jobId = row.job?.id ?? row.application?.job_id ?? 0
    const when = row.scheduled_at || row.created_at
    return {
      id: `int-${row.id}`,
      title: row.scheduled_at ? `Interview scheduled · ${name}` : `Interview updated · ${name}`,
      meta: `${row.job?.title ?? jobTitle(jobId)} · ${formatStatus(row.status)}`,
      at: when,
    }
  })

  return [...fromApps, ...fromInterviews]
    .filter(x => x.at)
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .slice(0, limit)
}

function formatStatus(s: string) {
  return s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

export function applicantsPerJob(apps: Application[], jobs: Job[], topN = 10): { jobId: number; title: string; count: number }[] {
  const counts = new Map<number, number>()
  for (const a of apps) {
    counts.set(a.job_id, (counts.get(a.job_id) ?? 0) + 1)
  }
  const rows = jobs.map(j => ({
    jobId: j.id,
    title: j.title,
    count: counts.get(j.id) ?? 0,
  }))
  return rows.sort((a, b) => b.count - a.count).slice(0, topN)
}

export function workspaceSourceSlices(apps: Application[]): Array<{ key: string; label: string; value: number; color: string }> {
  const palette = ['#0ea5e9', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#6b7280', '#8b5cf6', '#14b8a6']
  const acc: Record<string, number> = {}
  for (const a of apps) {
    const k = a.source_type || 'unknown'
    acc[k] = (acc[k] ?? 0) + 1
  }
  return Object.entries(acc)
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([key, value], i) => ({
      key,
      label: key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
      value,
      color: palette[i % palette.length],
    }))
}
