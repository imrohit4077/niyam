import type { Application } from '../../api/applications'
import type { Job } from '../../api/jobs'
import type { InterviewAssignmentRow } from '../../api/interviews'

export const DASHBOARD_CHART_COLORS = ['#0ea5e9', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#6b7280', '#8b5cf6']

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
    .filter(([, value]) => value > 0)
    .map(([label, value], index) => ({
      key: label,
      label: formatDashboardLabel(label),
      value,
      color: DASHBOARD_CHART_COLORS[index % DASHBOARD_CHART_COLORS.length],
    }))
}

export function countApplicationsInRange(applications: Application[], start: Date, end: Date) {
  const a = start.getTime()
  const b = end.getTime()
  return applications.filter(app => {
    const t = new Date(app.created_at).getTime()
    return t >= a && t < b
  }).length
}

export function countOffersInRange(applications: Application[], start: Date, end: Date) {
  const a = start.getTime()
  const b = end.getTime()
  return applications.filter(app => {
    if (app.status !== 'offer') return false
    const t = new Date(app.updated_at).getTime()
    return t >= a && t < b
  }).length
}

export function countJobsCreatedInRange(jobs: Job[], start: Date, end: Date) {
  const a = start.getTime()
  const b = end.getTime()
  return jobs.filter(job => {
    const t = new Date(job.created_at).getTime()
    return t >= a && t < b
  }).length
}

export function countInterviewsScheduledInRange(rows: InterviewAssignmentRow[], start: Date, end: Date) {
  const a = start.getTime()
  const b = end.getTime()
  return rows.filter(row => {
    if (!row.scheduled_at) return false
    const t = new Date(row.scheduled_at).getTime()
    return t >= a && t < b
  }).length
}

export type TrendResult = { direction: 'up' | 'down' | 'flat'; pct: number; label: string }

export function trendFromPeriods(current: number, previous: number): TrendResult {
  if (previous === 0 && current === 0) return { direction: 'flat', pct: 0, label: '0%' }
  if (previous === 0) return { direction: 'up', pct: 100, label: '+100%' }
  const raw = ((current - previous) / previous) * 100
  const rounded = Math.round(raw * 10) / 10
  const direction = rounded > 0 ? 'up' : rounded < 0 ? 'down' : 'flat'
  const sign = rounded > 0 ? '+' : ''
  return { direction, pct: Math.abs(rounded), label: `${sign}${rounded}%` }
}

const FUNNEL_STATUSES = ['applied', 'screening', 'interview', 'offer', 'hired'] as const

export function workspaceFunnelCounts(applications: Application[]) {
  const map: Record<string, number> = {}
  for (const s of FUNNEL_STATUSES) map[s] = 0
  for (const app of applications) {
    if (map[app.status] != null) map[app.status] += 1
  }
  return FUNNEL_STATUSES.map(key => ({
    key,
    label: formatDashboardLabel(key),
    value: map[key] ?? 0,
  }))
}

export function topJobsByApplicantCount(applications: Application[], jobs: Job[], limit = 8) {
  const byJob = applications.reduce<Record<number, number>>((acc, app) => {
    acc[app.job_id] = (acc[app.job_id] ?? 0) + 1
    return acc
  }, {})
  return Object.entries(byJob)
    .map(([jobId, count]) => ({
      jobId: Number(jobId),
      count,
      title: jobs.find(j => j.id === Number(jobId))?.title ?? `Job #${jobId}`,
    }))
    .sort((x, y) => y.count - x.count)
    .slice(0, limit)
}

export function workspaceSourceSlices(applications: Application[]): DashboardSlice[] {
  const acc = applications.reduce<Record<string, number>>((m, app) => {
    const source = app.source_type || 'unknown'
    m[source] = (m[source] ?? 0) + 1
    return m
  }, {})
  return makeDashboardSlices(Object.entries(acc))
}

export type ActivityKind = 'application' | 'stage' | 'interview' | 'offer' | 'hire'

export type ActivityItem = {
  id: string
  at: string
  title: string
  subtitle: string
  kind: ActivityKind
}

function inferActivityKind(status: string): ActivityKind {
  if (status === 'hired') return 'hire'
  if (status === 'offer') return 'offer'
  if (status === 'interview') return 'interview'
  if (status === 'screening') return 'stage'
  return 'stage'
}

/** Most common applicant status for a job; ties break toward later pipeline stages. */
const STAGE_TIE_PRIORITY = ['hired', 'offer', 'interview', 'screening', 'applied', 'pending', 'rejected', 'withdrawn']

export function dominantStageForJob(applications: Application[], jobId: number): string {
  const apps = applications.filter(a => a.job_id === jobId)
  if (apps.length === 0) return '—'
  const counts = apps.reduce<Record<string, number>>((acc, a) => {
    acc[a.status] = (acc[a.status] ?? 0) + 1
    return acc
  }, {})
  let best = ''
  let bestCount = -1
  let bestPri = 999
  for (const [st, n] of Object.entries(counts)) {
    const pri = STAGE_TIE_PRIORITY.indexOf(st)
    const p = pri === -1 ? 50 : pri
    if (n > bestCount || (n === bestCount && p < bestPri)) {
      bestCount = n
      best = st
      bestPri = p
    }
  }
  return best ? formatDashboardLabel(best) : '—'
}

export function buildActivityFeed(
  applications: Application[],
  jobs: Job[],
  interviews: InterviewAssignmentRow[] = [],
  max = 14,
): ActivityItem[] {
  const jobTitle = (jobId: number) => jobs.find(j => j.id === jobId)?.title ?? `Job #${jobId}`
  const items: ActivityItem[] = []

  for (const row of interviews) {
    if (!row.scheduled_at) continue
    const jid = row.job?.id ?? row.application?.job_id
    const jt = jid != null ? jobTitle(jid) : 'Interview'
    const who = row.application?.candidate_name || row.application?.candidate_email || 'Candidate'
    items.push({
      id: `iv-${row.id}-${row.scheduled_at}`,
      at: row.scheduled_at,
      title: 'Interview scheduled',
      subtitle: `${who} · ${jt}`,
      kind: 'interview',
    })
  }

  for (const app of applications) {
    const hist = [...(app.stage_history ?? [])].sort(
      (a, b) => new Date(b.changed_at).getTime() - new Date(a.changed_at).getTime(),
    )
    for (const h of hist) {
      items.push({
        id: `st-${app.id}-${h.changed_at}-${h.stage}`,
        at: h.changed_at,
        title: `Moved to ${formatDashboardLabel(h.stage)}`,
        subtitle: `${app.candidate_name || app.candidate_email} · ${jobTitle(app.job_id)}`,
        kind: inferActivityKind(h.stage),
      })
    }
    items.push({
      id: `new-${app.id}`,
      at: app.created_at,
      title: 'Candidate added',
      subtitle: `${app.candidate_name || app.candidate_email} · ${jobTitle(app.job_id)}`,
      kind: 'application',
    })
  }

  items.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
  return items.slice(0, max)
}
