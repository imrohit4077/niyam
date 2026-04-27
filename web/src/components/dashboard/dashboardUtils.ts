import type { Application } from '../../api/applications'
import type { Job } from '../../api/jobs'
import type { InterviewAssignmentRow } from '../../api/interviews'

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

const PIPELINE_ORDER = ['applied', 'screening', 'interview', 'offer', 'hired'] as const
export const PIPELINE_LABELS: Record<(typeof PIPELINE_ORDER)[number], string> = {
  applied: 'Applied',
  screening: 'Screening',
  interview: 'Interview',
  offer: 'Offer',
  hired: 'Hired',
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

/** Workspace-wide funnel: count applications in each canonical stage. */
export function aggregateWorkspacePipeline(applications: Application[]): DashboardSlice[] {
  return PIPELINE_ORDER.map((status, index) => ({
    key: status,
    label: PIPELINE_LABELS[status],
    value: applications.filter(a => a.status === status).length,
    color: DASHBOARD_CHART_COLORS[index % DASHBOARD_CHART_COLORS.length],
  })).filter(s => s.value > 0)
}

export function workspaceApplicationsBySource(applications: Application[]): DashboardSlice[] {
  const acc: Record<string, number> = {}
  applications.forEach(a => {
    const source = a.source_type || 'unknown'
    acc[source] = (acc[source] ?? 0) + 1
  })
  return makeDashboardSlices(Object.entries(acc))
}

export type TrendDirection = 'up' | 'down' | 'flat'

export type TrendResult = {
  direction: TrendDirection
  /** Rounded integer percent vs prior period; Infinity if prior was 0 and current > 0 → shown as 100 */
  percent: number
  prior: number
  current: number
}

function startOfDay(d: Date) {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

function addDays(d: Date, days: number) {
  const x = new Date(d)
  x.setDate(x.getDate() + days)
  return x
}

/** Compare count in [now-2L, now-L) vs [now-L, now) using date field. */
export function trendFromDates<T>(
  items: T[],
  getDate: (row: T) => string | null | undefined,
  windowDays = 30,
): TrendResult {
  const now = startOfDay(new Date())
  const L = windowDays
  const curStart = addDays(now, -L)
  const prevStart = addDays(now, -2 * L)
  let current = 0
  let prior = 0
  for (const row of items) {
    const raw = getDate(row)
    if (!raw) continue
    const t = startOfDay(new Date(raw)).getTime()
    if (t >= curStart.getTime() && t < now.getTime()) current += 1
    else if (t >= prevStart.getTime() && t < curStart.getTime()) prior += 1
  }
  let direction: TrendDirection = 'flat'
  let percent = 0
  if (prior > 0) {
    percent = Math.round(((current - prior) / prior) * 100)
    direction = percent > 0 ? 'up' : percent < 0 ? 'down' : 'flat'
  } else if (current > 0) {
    percent = 100
    direction = 'up'
  }
  return { direction, percent, prior, current }
}

export function trendMonthOverMonth(currentMonth: number, previousMonth: number): TrendResult {
  const prior = previousMonth
  const current = currentMonth
  let direction: TrendDirection = 'flat'
  let percent = 0
  if (prior > 0) {
    percent = Math.round(((current - prior) / prior) * 100)
    direction = percent > 0 ? 'up' : percent < 0 ? 'down' : 'flat'
  } else if (current > 0) {
    percent = 100
    direction = 'up'
  }
  return { direction, percent, prior, current }
}

/** Jobs created in calendar month vs prior month. */
export function jobCreationTrend(jobs: Job[]): TrendResult {
  const now = new Date()
  const y = now.getFullYear()
  const m = now.getMonth()
  const inMonth = (j: Job, year: number, month: number) => {
    const d = new Date(j.created_at)
    return d.getFullYear() === year && d.getMonth() === month
  }
  const current = jobs.filter(j => inMonth(j, y, m)).length
  const pm = m === 0 ? 11 : m - 1
  const py = m === 0 ? y - 1 : y
  const prior = jobs.filter(j => inMonth(j, py, pm)).length
  return trendMonthOverMonth(current, prior)
}

export function applicationsPerJobBars(
  applications: Application[],
  jobs: Job[],
  maxBars = 8,
): { labels: string[]; values: number[]; colors: string[] } {
  const byJob: Record<number, number> = {}
  applications.forEach(a => {
    byJob[a.job_id] = (byJob[a.job_id] ?? 0) + 1
  })
  const jobTitle = (id: number) => jobs.find(j => j.id === id)?.title ?? `Job #${id}`
  const sorted = Object.entries(byJob)
    .map(([id, value]) => ({ id: Number(id), value, label: jobTitle(Number(id)) }))
    .sort((a, b) => b.value - a.value)
    .slice(0, maxBars)
  return {
    labels: sorted.map(r => r.label),
    values: sorted.map(r => r.value),
    colors: sorted.map((_, i) => DASHBOARD_CHART_COLORS[i % DASHBOARD_CHART_COLORS.length]),
  }
}

export function formatDateTimeShort(value: string | null) {
  if (!value) return 'Not scheduled'
  return new Date(value).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export type ActivityKind = 'application' | 'interview' | 'offer' | 'hire' | 'job'

export type ActivityFeedItem = {
  id: string
  kind: ActivityKind
  title: string
  subtitle: string
  at: string
}

function kindLabel(kind: ActivityKind): string {
  switch (kind) {
    case 'application':
      return 'Candidate added'
    case 'interview':
      return 'Interview scheduled'
    case 'offer':
      return 'Offer stage'
    case 'hire':
      return 'Hired'
    case 'job':
      return 'Job updated'
  }
}

/** Recent activity from applications and interviews (latest first). */
export function buildActivityFeed(
  applications: Application[],
  interviews: InterviewAssignmentRow[],
  jobs: Job[],
  limit = 12,
): ActivityFeedItem[] {
  const jobTitle = (jobId: number) => jobs.find(j => j.id === jobId)?.title ?? `Job #${jobId}`

  const fromApps: ActivityFeedItem[] = applications.map(a => {
    let kind: ActivityKind = 'application'
    if (a.status === 'hired') kind = 'hire'
    else if (a.status === 'offer') kind = 'offer'
    else if (a.status === 'interview') kind = 'interview'
    const name = a.candidate_name || a.candidate_email
    return {
      id: `app-${a.id}-${a.updated_at}`,
      kind,
      title: kindLabel(kind),
      subtitle: `${name} · ${jobTitle(a.job_id)}`,
      at: a.updated_at,
    }
  })

  const fromInterviews: ActivityFeedItem[] = interviews.map(row => ({
    id: `int-${row.id}-${row.updated_at}`,
    kind: 'interview' as const,
    title: 'Interview assignment',
    subtitle: `${row.application?.candidate_name || row.application?.candidate_email || 'Candidate'} · ${row.job?.title ?? jobTitle(row.application?.job_id ?? 0)}`,
    at: row.scheduled_at || row.updated_at,
  }))

  return [...fromApps, ...fromInterviews]
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .slice(0, limit)
}

/** Furthest non-terminal stage in the standard funnel present for this job. */
export function primaryStageForJob(applications: Application[], jobId: number): string {
  const funnelFirst = ['hired', 'offer', 'interview', 'screening', 'applied'] as const
  const apps = applications.filter(a => a.job_id === jobId)
  if (apps.length === 0) return '—'
  for (const st of funnelFirst) {
    if (apps.some(a => a.status === st)) return formatDashboardLabel(st)
  }
  const max = Math.max(...apps.map(a => new Date(a.updated_at).getTime()))
  const latest = apps.find(a => new Date(a.updated_at).getTime() === max)
  return latest ? formatDashboardLabel(latest.status) : '—'
}
