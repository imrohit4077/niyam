import type { Application } from '../../api/applications'
import type { InterviewAssignmentRow } from '../../api/interviews'
import type { Job } from '../../api/jobs'

export type TrendDirection = 'up' | 'down' | 'flat'

export type TrendResult = {
  direction: TrendDirection
  /** Percentage point change vs prior period (e.g. 25 means +25%). */
  pct: number
  current: number
  previous: number
}

const MS_DAY = 86_400_000

export function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

export function daysAgo(days: number, from = new Date()) {
  return new Date(from.getTime() - days * MS_DAY)
}

export function addDays(from: Date, days: number) {
  return new Date(from.getTime() + days * MS_DAY)
}

export function countBetween<T>(items: T[], getTime: (item: T) => string | null | undefined, start: Date, end: Date) {
  const a = start.getTime()
  const b = end.getTime()
  return items.filter(item => {
    const raw = getTime(item)
    if (!raw) return false
    const t = new Date(raw).getTime()
    return t >= a && t < b
  }).length
}

export function computeTrend(current: number, previous: number): TrendResult {
  if (previous === 0 && current === 0) return { direction: 'flat', pct: 0, current, previous }
  if (previous === 0 && current > 0) return { direction: 'up', pct: 100, current, previous }
  const raw = ((current - previous) / previous) * 100
  const pct = Math.round(raw)
  const direction: TrendDirection = pct > 0 ? 'up' : pct < 0 ? 'down' : 'flat'
  return { direction, pct: Math.abs(pct), current, previous }
}

export function formatTrend(t: TrendResult, priorLabel: string) {
  if (t.direction === 'flat' && t.current === t.previous) return `Flat vs ${priorLabel}`
  const arrow = t.direction === 'up' ? '↑' : t.direction === 'down' ? '↓' : '→'
  const sign = t.direction === 'down' ? '-' : t.direction === 'up' ? '+' : ''
  if (t.previous === 0 && t.current > 0) return `${arrow} New vs ${priorLabel}`
  return `${arrow} ${sign}${t.pct}% vs ${priorLabel}`
}

const FUNNEL_STATUSES = ['applied', 'screening', 'interview', 'offer', 'hired'] as const

export type FunnelStage = (typeof FUNNEL_STATUSES)[number]

export function buildFunnelCounts(applications: Application[]) {
  const byStatus = applications.reduce<Record<string, number>>((acc, app) => {
    acc[app.status] = (acc[app.status] ?? 0) + 1
    return acc
  }, {})
  return FUNNEL_STATUSES.map(stage => ({
    stage,
    label: stage.charAt(0).toUpperCase() + stage.slice(1),
    value: byStatus[stage] ?? 0,
  }))
}

export function applicantsPerJob(applications: Application[], jobs: Job[], limit = 10) {
  const counts = applications.reduce<Record<number, number>>((acc, app) => {
    acc[app.job_id] = (acc[app.job_id] ?? 0) + 1
    return acc
  }, {})
  const jobById = new Map(jobs.map(j => [j.id, j]))
  return Object.entries(counts)
    .map(([jobId, count]) => ({
      jobId: Number(jobId),
      count,
      title: jobById.get(Number(jobId))?.title ?? `Job #${jobId}`,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit)
}

export type ActivityKind = 'application' | 'stage' | 'interview'

export type ActivityFeedItem = {
  id: string
  at: string
  kind: ActivityKind
  title: string
  subtitle: string
}

export function buildActivityFeed(
  applications: Application[],
  interviews: InterviewAssignmentRow[],
  maxItems = 14,
): ActivityFeedItem[] {
  const items: ActivityFeedItem[] = []

  for (const app of applications) {
    items.push({
      id: `app-${app.id}-created`,
      at: app.created_at,
      kind: 'application',
      title: `${app.candidate_name || app.candidate_email} applied`,
      subtitle: `Application · ${formatStage(app.status)}`,
    })
    const history = app.stage_history ?? []
    for (let i = 0; i < history.length; i++) {
      const h = history[i]
      if (!h?.changed_at) continue
      if (i === 0 && h.stage === 'applied') continue
      items.push({
        id: `app-${app.id}-stage-${i}-${h.changed_at}`,
        at: h.changed_at,
        kind: 'stage',
        title: `Moved to ${formatStage(h.stage)}`,
        subtitle: `${app.candidate_name || app.candidate_email}`,
      })
    }
  }

  for (const row of interviews) {
    const at = row.scheduled_at || row.updated_at || row.created_at
    if (!at) continue
    const name = row.application?.candidate_name || row.application?.candidate_email || 'Candidate'
    const jobTitle = row.job?.title ?? 'Role'
    items.push({
      id: `int-${row.id}-${at}`,
      at,
      kind: 'interview',
      title: `Interview ${formatStage(row.status)}`,
      subtitle: `${name} · ${jobTitle}`,
    })
  }

  items.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())

  const seen = new Set<string>()
  const deduped: ActivityFeedItem[] = []
  for (const it of items) {
    if (seen.has(it.id)) continue
    seen.add(it.id)
    deduped.push(it)
    if (deduped.length >= maxItems) break
  }
  return deduped
}

function formatStage(s: string) {
  return s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

export function countHistoryStageEntries(
  applications: Application[],
  stage: string,
  start: Date,
  end: Date,
) {
  const a = start.getTime()
  const b = end.getTime()
  let n = 0
  for (const app of applications) {
    for (const h of app.stage_history ?? []) {
      if (h.stage !== stage) continue
      const t = new Date(h.changed_at).getTime()
      if (t >= a && t < b) n += 1
    }
  }
  return n
}

export function countJobsCreatedBetween(jobs: Job[], start: Date, end: Date) {
  const a = start.getTime()
  const b = end.getTime()
  return jobs.filter(j => {
    const t = new Date(j.created_at).getTime()
    return t >= a && t < b
  }).length
}

export function countScheduledInterviewsBetween(rows: InterviewAssignmentRow[], start: Date, end: Date) {
  const a = start.getTime()
  const b = end.getTime()
  return rows.filter(r => {
    if (!r.scheduled_at) return false
    const t = new Date(r.scheduled_at).getTime()
    return t >= a && t < b
  }).length
}

export function dominantStageForJob(applications: Application[], jobId: number): string {
  const counts = applications
    .filter(a => a.job_id === jobId)
    .reduce<Record<string, number>>((acc, a) => {
      acc[a.status] = (acc[a.status] ?? 0) + 1
      return acc
    }, {})
  let best = ''
  let n = 0
  for (const [k, v] of Object.entries(counts)) {
    if (v > n) {
      n = v
      best = k
    }
  }
  return best ? formatStage(best) : '—'
}
