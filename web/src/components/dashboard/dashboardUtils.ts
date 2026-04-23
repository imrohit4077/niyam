import type { Application } from '../../api/applications'
import type { Job } from '../../api/jobs'
import type { TrendDirection } from './DashboardSummaryCard'

export function formatDashboardLabel(value: string) {
  return value.replace(/_/g, ' ').replace(/\b\w/g, ch => ch.toUpperCase())
}

export function percentChangeVsPrior(prev: number, curr: number): { pct: number | null; direction: TrendDirection } {
  if (prev === 0 && curr === 0) return { pct: null, direction: 'neutral' }
  if (prev === 0) return { pct: null, direction: curr > 0 ? 'up' : 'neutral' }
  const raw = Math.round(((curr - prev) / prev) * 100)
  if (raw === 0) return { pct: 0, direction: 'neutral' }
  return { pct: Math.abs(raw), direction: raw > 0 ? 'up' : 'down' }
}

export function countInRange<T>(items: T[], getTime: (item: T) => number | null, startMs: number, endMs: number): number {
  return items.filter(item => {
    const t = getTime(item)
    if (t == null) return false
    return t >= startMs && t < endMs
  }).length
}

export type ActivityFeedItem = {
  id: string
  action: string
  detail: string
  at: string
}

export function buildActivityFeed(applications: Application[], limit = 14): ActivityFeedItem[] {
  const sorted = [...applications].sort(
    (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
  )
  const out: ActivityFeedItem[] = []
  for (const app of sorted) {
    if (out.length >= limit) break
    const created = new Date(app.created_at).getTime()
    const updated = new Date(app.updated_at).getTime()
    const name = app.candidate_name || app.candidate_email
    let action = 'Application updated'
    if (updated - created < 90_000) action = 'Candidate applied'
    else if (app.status === 'hired') action = 'Candidate hired'
    else if (app.status === 'offer') action = 'Offer released'
    else if (app.status === 'interview') action = 'Interview stage'
    else if (app.status === 'screening') action = 'Moved to screening'
    else if (app.status === 'rejected') action = 'Application rejected'
    else if (app.status === 'withdrawn') action = 'Application withdrawn'
    else if (app.status === 'applied') action = 'In applied stage'

    out.push({
      id: `app-${app.id}-${updated}`,
      action,
      detail: name,
      at: app.updated_at,
    })
  }
  return out
}

/** Mode of application status for a job (most common non-terminal or any). */
export function dominantStageForJob(jobId: number, applications: Application[]): string {
  const counts: Record<string, number> = {}
  for (const a of applications) {
    if (a.job_id !== jobId) continue
    counts[a.status] = (counts[a.status] ?? 0) + 1
  }
  const entries = Object.entries(counts)
  if (entries.length === 0) return '—'
  entries.sort((a, b) => b[1] - a[1])
  return formatDashboardLabel(entries[0][0])
}

const MS_DAY = 86_400_000

export function rolling30DayPair<T>(
  items: T[],
  getTime: (item: T) => number | null,
  anchorMs: number,
): { recent: number; prior: number } {
  if (!anchorMs || Number.isNaN(anchorMs)) return { recent: 0, prior: 0 }
  const recentStart = anchorMs - 30 * MS_DAY
  const priorStart = anchorMs - 60 * MS_DAY
  const recent = countInRange(items, getTime, recentStart, anchorMs + 1)
  const prior = countInRange(items, getTime, priorStart, recentStart)
  return { recent, prior }
}

export function jobRowsForTable(jobs: Job[], applications: Application[]): Array<{
  job: Job
  applicants: number
  stage: string
}> {
  return jobs.map(job => ({
    job,
    applicants: applications.filter(a => a.job_id === job.id).length,
    stage: dominantStageForJob(job.id, applications),
  }))
}
