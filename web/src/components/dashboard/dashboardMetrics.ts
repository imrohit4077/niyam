import type { Application } from '../../api/applications'
import type { InterviewAssignmentRow } from '../../api/interviews'
import type { Job } from '../../api/jobs'

export const FUNNEL_STATUSES = ['applied', 'screening', 'interview', 'offer', 'hired'] as const
export type FunnelStatus = (typeof FUNNEL_STATUSES)[number]

export function formatDashboardLabel(value: string) {
  return value.replace(/_/g, ' ').replace(/\b\w/g, ch => ch.toUpperCase())
}

export type TrendResult = {
  current: number
  previous: number
  percentChange: number | null
  direction: 'up' | 'down' | 'flat'
}

/** Compare count in [now - recentDays, now) vs [now - 2*recentDays, now - recentDays). */
export function trendFromTimestamps(
  items: { timestamp: string }[],
  recentDays: number,
): TrendResult {
  const now = Date.now()
  const msDay = 86_400_000
  const recentStart = now - recentDays * msDay
  const prevStart = now - 2 * recentDays * msDay
  const prevEnd = recentStart

  let current = 0
  let previous = 0
  for (const { timestamp } of items) {
    const t = new Date(timestamp).getTime()
    if (Number.isNaN(t)) continue
    if (t >= recentStart && t < now) current += 1
    else if (t >= prevStart && t < prevEnd) previous += 1
  }

  if (previous === 0 && current === 0) {
    return { current, previous, percentChange: null, direction: 'flat' }
  }
  if (previous === 0) {
    return { current, previous, percentChange: null, direction: current > 0 ? 'up' : 'flat' }
  }
  const raw = ((current - previous) / previous) * 100
  const percentChange = Math.round(raw)
  const direction = percentChange > 0 ? 'up' : percentChange < 0 ? 'down' : 'flat'
  return { current, previous, percentChange, direction }
}

export function formatTrendPercent(t: TrendResult): string {
  if (t.percentChange === null) {
    if (t.direction === 'up' && t.previous === 0 && t.current > 0) return 'New'
    return '—'
  }
  const sign = t.percentChange > 0 ? '+' : ''
  return `${sign}${t.percentChange}%`
}

export type ActivityKind = 'application' | 'interview' | 'stage'

export type ActivityItem = {
  id: string
  kind: ActivityKind
  title: string
  subtitle: string
  at: string
  sortKey: number
}

export function buildActivityFeed(
  applications: Application[],
  interviews: InterviewAssignmentRow[],
  maxItems: number,
): ActivityItem[] {
  const items: ActivityItem[] = []

  for (const app of applications) {
    const name = app.candidate_name || app.candidate_email || 'Candidate'
    items.push({
      id: `app-${app.id}`,
      kind: 'application',
      title: `${name} applied`,
      subtitle: `Application · ${formatDashboardLabel(app.status)}`,
      at: app.created_at,
      sortKey: new Date(app.created_at).getTime(),
    })

    const history = app.stage_history ?? []
    for (let i = 0; i < history.length; i++) {
      const h = history[i]
      if (!h?.changed_at) continue
      items.push({
        id: `stage-${app.id}-${i}-${h.changed_at}`,
        kind: 'stage',
        title: `${name} moved to ${formatDashboardLabel(h.stage)}`,
        subtitle: 'Pipeline update',
        at: h.changed_at,
        sortKey: new Date(h.changed_at).getTime(),
      })
    }
  }

  for (const row of interviews) {
    const name =
      row.application?.candidate_name || row.application?.candidate_email || 'Candidate'
    const jobTitle = row.job?.title ?? (row.application?.job_id ? `Job #${row.application.job_id}` : 'Role')
    const label =
      row.scheduled_at && (row.status === 'scheduled' || row.status === 'pending')
        ? 'Interview scheduled'
        : 'Interview updated'
    items.push({
      id: `int-${row.id}`,
      kind: 'interview',
      title: `${label}: ${name}`,
      subtitle: jobTitle,
      at: row.scheduled_at || row.updated_at || row.created_at,
      sortKey: new Date(row.scheduled_at || row.updated_at || row.created_at).getTime(),
    })
  }

  items.sort((a, b) => b.sortKey - a.sortKey)
  return items.slice(0, maxItems)
}

export function formatActivityTime(iso: string) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function applicantsPerJob(applications: Application[]): Map<number, number> {
  const m = new Map<number, number>()
  for (const a of applications) {
    m.set(a.job_id, (m.get(a.job_id) ?? 0) + 1)
  }
  return m
}

export function dominantApplicantStatusForJob(
  applications: Application[],
  jobId: number,
): string {
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

export function funnelCountsFromApplications(applications: Application[]): number[] {
  const set = new Set<string>(FUNNEL_STATUSES)
  const counts: Record<string, number> = {}
  for (const s of FUNNEL_STATUSES) counts[s] = 0
  for (const a of applications) {
    const key = a.status
    if (set.has(key as FunnelStatus)) counts[key] += 1
  }
  return FUNNEL_STATUSES.map(s => counts[s] ?? 0)
}

export function workspaceSourceSlices(
  applications: Application[],
  colors: string[],
): { label: string; value: number; color: string }[] {
  const acc: Record<string, number> = {}
  for (const a of applications) {
    const source = a.source_type || 'unknown'
    acc[source] = (acc[source] ?? 0) + 1
  }
  return Object.entries(acc)
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([label, value], i) => ({
      label: formatDashboardLabel(label),
      value,
      color: colors[i % colors.length],
    }))
}

export function topJobsByApplicants(
  jobs: Job[],
  applications: Application[],
  limit: number,
): { job: Job; count: number }[] {
  const per = applicantsPerJob(applications)
  return jobs
    .map(job => ({ job, count: per.get(job.id) ?? 0 }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit)
}

/** Timestamps to treat as "offer released" signals (stage history or last update). */
export function offerActivityTimestamps(applications: Application[]): { timestamp: string }[] {
  const out: { timestamp: string }[] = []
  for (const app of applications) {
    if (app.status !== 'offer') continue
    let best = app.updated_at
    for (const h of app.stage_history ?? []) {
      if (h.stage === 'offer' && h.changed_at && h.changed_at > best) best = h.changed_at
    }
    out.push({ timestamp: best })
  }
  return out
}
