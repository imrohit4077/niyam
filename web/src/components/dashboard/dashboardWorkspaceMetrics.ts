import type { Application } from '../../api/applications'
import type { InterviewAssignmentRow } from '../../api/interviews'
import type { Job } from '../../api/jobs'

export type TrendDirection = 'up' | 'down' | 'flat'

export function formatTrendPercent(pct: number, direction: TrendDirection): string {
  if (direction === 'flat' || !Number.isFinite(pct)) return '—'
  const rounded = Math.abs(pct) >= 10 ? Math.round(pct) : Math.round(pct * 10) / 10
  const sign = direction === 'up' ? '+' : '−'
  return `${sign}${rounded}%`
}

/** Canonical funnel stages for workspace visualization */
export const PIPELINE_FUNNEL_STAGES = ['applied', 'screening', 'interview', 'offer', 'hired'] as const
export type PipelineFunnelStage = (typeof PIPELINE_FUNNEL_STAGES)[number]

export function startOfUtcDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
}

export function countApplicationsCreatedBetween(apps: Application[], fromMs: number, toMs: number): number {
  return apps.filter(a => {
    const t = new Date(a.created_at).getTime()
    return t >= fromMs && t < toMs
  }).length
}

export function trendFromCounts(current: number, previous: number): { direction: TrendDirection; percent: number } {
  if (previous === 0 && current === 0) return { direction: 'flat', percent: 0 }
  if (previous === 0) return { direction: 'up', percent: 100 }
  const raw = ((current - previous) / previous) * 100
  const pct = Math.min(999, Math.abs(raw))
  if (Math.abs(raw) < 0.5) return { direction: 'flat', percent: 0 }
  return { direction: raw > 0 ? 'up' : 'down', percent: pct }
}

export function countJobsCreatedBetween(jobs: Job[], fromMs: number, toMs: number): number {
  return jobs.filter(j => {
    const t = new Date(j.created_at).getTime()
    return t >= fromMs && t < toMs
  }).length
}

export function countOffersTouchedBetween(apps: Application[], fromMs: number, toMs: number): number {
  return apps.filter(a => {
    if (a.status !== 'offer') return false
    const t = new Date(a.updated_at).getTime()
    return t >= fromMs && t < toMs
  }).length
}

export function countScheduledInterviewsTouchingBetween(rows: InterviewAssignmentRow[], fromMs: number, toMs: number): number {
  return rows.filter(row => {
    const t = new Date(row.updated_at).getTime()
    return t >= fromMs && t < toMs && (row.status === 'scheduled' || row.status === 'pending' || !!row.scheduled_at)
  }).length
}

export function funnelCountsForWorkspace(apps: Application[]): number[] {
  return PIPELINE_FUNNEL_STAGES.map(stage =>
    apps.reduce((n, a) => (normalizeApplicationStage(a.status) === stage ? n + 1 : n), 0),
  )
}

/** Map API statuses into funnel buckets (best-effort). */
export function normalizeApplicationStage(status: string): PipelineFunnelStage | 'other' {
  const s = status.toLowerCase()
  if (s === 'applied') return 'applied'
  if (s === 'screening') return 'screening'
  if (s === 'interview') return 'interview'
  if (s === 'offer') return 'offer'
  if (s === 'hired') return 'hired'
  return 'other'
}

export function applicantsPerJob(apps: Application[], jobs: Job[], limit = 10): { jobId: number; title: string; count: number }[] {
  const map = new Map<number, number>()
  for (const a of apps) {
    map.set(a.job_id, (map.get(a.job_id) ?? 0) + 1)
  }
  const titleById = new Map(jobs.map(j => [j.id, j.title]))
  return [...map.entries()]
    .map(([jobId, count]) => ({ jobId, title: titleById.get(jobId) ?? `Job #${jobId}`, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit)
}

export type ActivityFeedItem = {
  id: string
  at: string
  title: string
  detail: string
  badge: string
  /** Key into STAGE_COLORS / tag styles on the dashboard */
  tagKey: string
}

function tagKeyForApplicationStatus(status: string): string {
  const s = status.toLowerCase()
  if (s === 'hired') return 'hired'
  if (s === 'offer') return 'offer'
  if (s === 'interview') return 'interview'
  if (s === 'screening') return 'screening'
  if (s === 'applied') return 'applied'
  return 'pending'
}

export function buildActivityFeed(
  apps: Application[],
  interviews: InterviewAssignmentRow[],
  jobTitle: (jobId: number) => string,
  limit = 14,
): ActivityFeedItem[] {
  const items: ActivityFeedItem[] = []

  const recentApps = [...apps].sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()).slice(0, 100)

  for (const a of recentApps) {
    const job = jobTitle(a.job_id)
    const name = a.candidate_name?.trim() || a.candidate_email
    const hist = a.stage_history
    if (hist && hist.length > 0) {
      const last = hist[hist.length - 1]
      items.push({
        id: `app-${a.id}-stage-${last.changed_at}`,
        at: last.changed_at,
        title: name,
        detail: `Stage → ${formatStageLabel(last.stage)} · ${job}`,
        badge: formatStageLabel(last.stage),
        tagKey: tagKeyForApplicationStatus(last.stage),
      })
    } else {
      items.push({
        id: `app-${a.id}-created`,
        at: a.created_at,
        title: name,
        detail: `Candidate added · ${job}`,
        badge: 'Applied',
        tagKey: 'applied',
      })
    }
  }

  const recentInts = [...interviews].sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()).slice(0, 50)

  for (const row of recentInts) {
    const name = row.application?.candidate_name?.trim() || row.application?.candidate_email || 'Candidate'
    const job = row.job?.title ?? (row.application?.job_id != null ? jobTitle(row.application.job_id) : '—')
    if (row.scheduled_at && (row.status === 'scheduled' || row.status === 'pending')) {
      items.push({
        id: `int-${row.id}-sched`,
        at: row.scheduled_at,
        title: name,
        detail: `Interview scheduled · ${job}`,
        badge: 'Interview',
        tagKey: 'scheduled',
      })
    }
  }

  items.sort((x, y) => new Date(y.at).getTime() - new Date(x.at).getTime())
  return items.slice(0, limit)
}

function formatStageLabel(raw: string): string {
  return raw.replace(/_/g, ' ').replace(/\b\w/g, ch => ch.toUpperCase())
}

const STAGE_RANK: Record<string, number> = {
  hired: 6,
  offer: 5,
  interview: 4,
  screening: 3,
  applied: 2,
  pending: 2,
  rejected: 1,
  withdrawn: 1,
}

/** Most common status for applicants on this job; ties broken by furthest pipeline stage. */
export function dominantStageForJob(apps: Application[], jobId: number): string {
  const counts: Record<string, number> = {}
  for (const a of apps) {
    if (a.job_id !== jobId) continue
    counts[a.status] = (counts[a.status] ?? 0) + 1
  }
  const keys = Object.keys(counts)
  if (keys.length === 0) return '—'
  return keys.reduce((best, cur) => {
    const cb = counts[best] ?? 0
    const cc = counts[cur] ?? 0
    if (cc > cb) return cur
    if (cc < cb) return best
    return (STAGE_RANK[cur] ?? 0) >= (STAGE_RANK[best] ?? 0) ? cur : best
  })
}
