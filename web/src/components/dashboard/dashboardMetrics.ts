import type { Application } from '../../api/applications'
import type { InterviewAssignmentRow } from '../../api/interviews'
import type { Job } from '../../api/jobs'

export const PIPELINE_FUNNEL_STATUSES = ['applied', 'screening', 'interview', 'offer', 'hired'] as const

export type TrendDirection = 'up' | 'down' | 'neutral'

/** Month key `YYYY-MM` in local time */
export function monthKeyLocal(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export function countInMonth<T>(items: T[], getDate: (item: T) => string | null | undefined, monthKey: string): number {
  let n = 0
  for (const item of items) {
    const raw = getDate(item)
    if (!raw) continue
    const t = new Date(raw)
    if (Number.isNaN(t.getTime())) continue
    if (monthKeyLocal(t) === monthKey) n += 1
  }
  return n
}

export function trendFromCounts(current: number, previous: number): { label: string; direction: TrendDirection } {
  if (previous === 0 && current === 0) return { label: '0%', direction: 'neutral' }
  if (previous === 0 && current > 0) return { label: 'New', direction: 'up' }
  const pct = Math.round(((current - previous) / previous) * 100)
  const direction: TrendDirection = pct > 0 ? 'up' : pct < 0 ? 'down' : 'neutral'
  const sign = pct > 0 ? '+' : ''
  return { label: `${sign}${pct}%`, direction }
}

export function countApplicationsByStatus(applications: Application[]): Record<string, number> {
  return applications.reduce<Record<string, number>>((acc, a) => {
    acc[a.status] = (acc[a.status] ?? 0) + 1
    return acc
  }, {})
}

export function applicantsPerJob(applications: Application[]): Map<number, number> {
  const m = new Map<number, number>()
  for (const a of applications) {
    m.set(a.job_id, (m.get(a.job_id) ?? 0) + 1)
  }
  return m
}

const STAGE_PRIORITY = ['hired', 'offer', 'interview', 'screening', 'applied', 'rejected', 'withdrawn'] as const

export function dominantStageForJob(jobId: number, applications: Application[]): string | null {
  const counts = applications
    .filter(a => a.job_id === jobId)
    .reduce<Record<string, number>>((acc, a) => {
      acc[a.status] = (acc[a.status] ?? 0) + 1
      return acc
    }, {})
  let best: string | null = null
  let bestCount = -1
  for (const stage of STAGE_PRIORITY) {
    const c = counts[stage] ?? 0
    if (c > bestCount) {
      bestCount = c
      best = stage
    }
  }
  if (bestCount <= 0) return null
  return best
}

export type ActivityKind = 'application' | 'interview' | 'stage'

export type ActivityFeedItem = {
  id: string
  kind: ActivityKind
  title: string
  meta: string
  at: string
}

function formatStageHistoryLabel(stage: string): string {
  return stage.replace(/_/g, ' ').replace(/\b\w/g, ch => ch.toUpperCase())
}

export function buildActivityFeed(
  applications: Application[],
  interviews: InterviewAssignmentRow[],
  jobTitleById: Map<number, string>,
  limit = 12,
): ActivityFeedItem[] {
  const items: ActivityFeedItem[] = []

  for (const app of applications) {
    const jobLabel = jobTitleById.get(app.job_id) ?? `Job #${app.job_id}`
    items.push({
      id: `app-${app.id}`,
      kind: 'application',
      title: `Candidate added: ${app.candidate_name || app.candidate_email}`,
      meta: `Application · ${jobLabel}`,
      at: app.created_at,
    })
    const history = app.stage_history ?? []
    for (let i = 0; i < history.length; i += 1) {
      const h = history[i]
      if (!h?.changed_at) continue
      items.push({
        id: `stage-${app.id}-${i}-${h.changed_at}`,
        kind: 'stage',
        title: `Stage → ${formatStageHistoryLabel(h.stage)}`,
        meta: app.candidate_name || app.candidate_email,
        at: h.changed_at,
      })
    }
  }

  for (const row of interviews) {
    const at = row.scheduled_at || row.updated_at
    if (!at) continue
    const name = row.application?.candidate_name || row.application?.candidate_email || 'Candidate'
    const jobTitle = row.job?.title ?? 'Interview'
    if (row.scheduled_at) {
      items.push({
        id: `int-${row.id}-sched`,
        kind: 'interview',
        title: `Interview scheduled: ${name}`,
        meta: jobTitle,
        at: row.scheduled_at,
      })
    }
  }

  items.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
  return items.slice(0, limit)
}

export function newJobsInRange(jobs: Job[], start: Date, end: Date): number {
  const s = start.getTime()
  const e = end.getTime()
  return jobs.filter(j => {
    const t = new Date(j.created_at).getTime()
    return t >= s && t < e
  }).length
}

export function countScheduledInterviewsInMonth(rows: InterviewAssignmentRow[], monthKey: string): number {
  let n = 0
  for (const row of rows) {
    if (!row.scheduled_at) continue
    const t = new Date(row.scheduled_at)
    if (Number.isNaN(t.getTime())) continue
    if (monthKeyLocal(t) === monthKey) n += 1
  }
  return n
}

export function countOffersTouchedInMonth(applications: Application[], monthKey: string): number {
  let n = 0
  for (const a of applications) {
    if (a.status !== 'offer') continue
    const t = new Date(a.updated_at)
    if (Number.isNaN(t.getTime())) continue
    if (monthKeyLocal(t) === monthKey) n += 1
  }
  return n
}
