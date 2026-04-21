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

export function makeDashboardSlices(entries: Array<[string, number]>) {
  return entries
    .filter(([, v]) => v > 0)
    .map(([label, value], index) => ({
      key: label,
      label: formatDashboardLabel(label),
      value,
      color: DASHBOARD_CHART_COLORS[index % DASHBOARD_CHART_COLORS.length],
    }))
}

const FUNNEL_STATUSES = ['applied', 'screening', 'interview', 'offer', 'hired'] as const

/** Cumulative funnel: each stage includes all later positive pipeline stages (excludes rejected / withdrawn). */
export function workspaceFunnelCounts(apps: Application[]) {
  const inFunnel = apps.filter(a => a.status !== 'rejected' && a.status !== 'withdrawn')
  const countAtLeast = (statuses: readonly string[]) => inFunnel.filter(a => statuses.includes(a.status)).length

  const hired = countAtLeast(['hired'])
  const offer = countAtLeast(['offer', 'hired'])
  const interview = countAtLeast(['interview', 'offer', 'hired'])
  const screening = countAtLeast(['screening', 'interview', 'offer', 'hired'])
  const applied = countAtLeast(['applied', 'screening', 'interview', 'offer', 'hired'])

  return FUNNEL_STATUSES.map((key, i) => {
    const values = [applied, screening, interview, offer, hired]
    return { key, label: formatDashboardLabel(key), value: values[i] }
  })
}

export function applicantsPerJob(apps: Application[], jobs: Job[], limit = 10) {
  const counts = new Map<number, number>()
  for (const a of apps) {
    counts.set(a.job_id, (counts.get(a.job_id) ?? 0) + 1)
  }
  const rows = jobs.map(job => ({
    jobId: job.id,
    title: job.title,
    count: counts.get(job.id) ?? 0,
  }))
  rows.sort((a, b) => b.count - a.count)
  return rows.slice(0, limit)
}

export type ActivityKind = 'candidate_added' | 'interview' | 'hired' | 'offer'

export type ActivityItem = {
  id: string
  at: string
  kind: ActivityKind
  title: string
  detail: string
}

export function buildActivityFeed(
  apps: Application[],
  interviews: InterviewAssignmentRow[],
  jobs: Job[],
  limit = 14,
): ActivityItem[] {
  const jobTitle = (jobId: number) => jobs.find(j => j.id === jobId)?.title ?? `Job #${jobId}`

  const items: ActivityItem[] = []

  for (const a of apps) {
    items.push({
      id: `app-created-${a.id}`,
      at: a.created_at,
      kind: 'candidate_added',
      title: 'Candidate applied',
      detail: `${a.candidate_name || a.candidate_email} · ${jobTitle(a.job_id)}`,
    })
    if (a.status === 'hired') {
      items.push({
        id: `app-hired-${a.id}`,
        at: a.updated_at,
        kind: 'hired',
        title: 'Candidate hired',
        detail: `${a.candidate_name || a.candidate_email} · ${jobTitle(a.job_id)}`,
      })
    } else if (a.status === 'offer') {
      items.push({
        id: `app-offer-${a.id}`,
        at: a.updated_at,
        kind: 'offer',
        title: 'Offer stage',
        detail: `${a.candidate_name || a.candidate_email} · ${jobTitle(a.job_id)}`,
      })
    }
  }

  for (const row of interviews) {
    const when = row.scheduled_at || row.created_at
    const name = row.application?.candidate_name || row.application?.candidate_email || 'Candidate'
    const jt = row.job?.title ?? (row.application?.job_id != null ? jobTitle(row.application.job_id) : 'Role')
    items.push({
      id: `int-${row.id}`,
      at: when,
      kind: 'interview',
      title: row.scheduled_at ? 'Interview scheduled' : 'Interview activity',
      detail: `${name} · ${jt}`,
    })
  }

  items.sort((x, y) => new Date(y.at).getTime() - new Date(x.at).getTime())

  const seen = new Set<string>()
  const deduped: ActivityItem[] = []
  for (const it of items) {
    if (seen.has(it.id)) continue
    seen.add(it.id)
    deduped.push(it)
    if (deduped.length >= limit) break
  }
  return deduped
}

export function countInRange(isoDates: string[], start: Date, end: Date) {
  let n = 0
  for (const iso of isoDates) {
    const t = new Date(iso).getTime()
    if (t >= start.getTime() && t < end.getTime()) n += 1
  }
  return n
}

export function percentChange(prev: number, curr: number): { pct: number; direction: 'up' | 'down' | 'flat' } {
  if (prev === 0 && curr === 0) return { pct: 0, direction: 'flat' }
  if (prev === 0) return { pct: 100, direction: 'up' }
  const raw = Math.round(((curr - prev) / prev) * 100)
  const direction = raw > 0 ? 'up' : raw < 0 ? 'down' : 'flat'
  return { pct: Math.min(999, Math.abs(raw)), direction }
}

export function dominantApplicantStage(apps: Application[]): string {
  if (apps.length === 0) return '—'
  const counts = apps.reduce<Record<string, number>>((acc, a) => {
    acc[a.status] = (acc[a.status] ?? 0) + 1
    return acc
  }, {})
  const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]
  return top ? formatDashboardLabel(top[0]) : '—'
}

export function compareRollingWindows(isoDates: string[], windowDays = 14) {
  const now = Date.now()
  const ms = windowDays * 86400000
  const currStart = new Date(now - ms)
  const prevStart = new Date(now - 2 * ms)
  const prevEnd = currStart
  return {
    curr: countInRange(isoDates, currStart, new Date(now)),
    prev: countInRange(isoDates, prevStart, prevEnd),
  }
}

/** New job records created in each rolling window (proxy for hiring momentum). */
export function compareJobCreations(jobs: Job[], windowDays = 14) {
  const dates = jobs.map(j => j.created_at)
  return compareRollingWindows(dates, windowDays)
}
