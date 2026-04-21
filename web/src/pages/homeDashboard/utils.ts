import type { Application } from '../../api/applications'
import type { InterviewAssignmentRow } from '../../api/interviews'
import type { Job } from '../../api/jobs'
import { DASHBOARD_CHART_COLORS, PIPELINE_FUNNEL_KEYS } from './constants'

export type DashboardSlice = {
  key: string
  label: string
  value: number
  color: string
}

export function formatDashboardLabel(value: string) {
  return value.replace(/_/g, ' ').replace(/\b\w/g, ch => ch.toUpperCase())
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

export function formatRelativeTime(iso: string) {
  const t = new Date(iso).getTime()
  const diff = Date.now() - t
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'Just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d < 7) return `${d}d ago`
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
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

export type TrendResult = {
  pctLabel: string
  up: boolean | null
  /** null = flat / no comparison */
  flat: boolean
}

/** Compare two period totals into a % change label for UI. */
export function trendFromPeriods(current: number, previous: number): TrendResult {
  if (current === 0 && previous === 0) return { pctLabel: '0%', up: null, flat: true }
  if (previous === 0) return { pctLabel: current > 0 ? '+100%' : '0%', up: current > 0, flat: current === 0 }
  const raw = Math.round(((current - previous) / previous) * 100)
  if (raw === 0) return { pctLabel: '0%', up: null, flat: true }
  return { pctLabel: `${raw > 0 ? '+' : ''}${raw}%`, up: raw > 0, flat: false }
}

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
}

/** Last 30 days vs previous 30 days, by created_at. */
export function countApplicationsInWindows(
  applications: Application[],
): { current: number; previous: number } {
  const now = new Date()
  const curEnd = startOfDay(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1))
  const curStart = curEnd - 30 * 86400000
  const prevStart = curStart - 30 * 86400000
  let current = 0
  let previous = 0
  for (const a of applications) {
    const t = new Date(a.created_at).getTime()
    if (t >= curStart && t < curEnd) current += 1
    else if (t >= prevStart && t < curStart) previous += 1
  }
  return { current, previous }
}

export function countJobsCreatedInWindows(jobs: Job[]): { current: number; previous: number } {
  const now = new Date()
  const curEnd = startOfDay(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1))
  const curStart = curEnd - 30 * 86400000
  const prevStart = curStart - 30 * 86400000
  let current = 0
  let previous = 0
  for (const j of jobs) {
    const t = new Date(j.created_at).getTime()
    if (t >= curStart && t < curEnd) current += 1
    else if (t >= prevStart && t < curStart) previous += 1
  }
  return { current, previous }
}

/** Interviews with scheduled_at in each window. */
export function countScheduledInterviewsInWindows(
  rows: InterviewAssignmentRow[],
): { current: number; previous: number } {
  const now = new Date()
  const curEnd = startOfDay(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1))
  const curStart = curEnd - 30 * 86400000
  const prevStart = curStart - 30 * 86400000
  let current = 0
  let previous = 0
  for (const r of rows) {
    if (!r.scheduled_at) continue
    const t = new Date(r.scheduled_at).getTime()
    if (t >= curStart && t < curEnd) current += 1
    else if (t >= prevStart && t < curStart) previous += 1
  }
  return { current, previous }
}

/** Applications in offer status with updated_at in window (proxy for “offers released”). */
export function countOffersTouchedInWindows(applications: Application[]): { current: number; previous: number } {
  const now = new Date()
  const curEnd = startOfDay(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1))
  const curStart = curEnd - 30 * 86400000
  const prevStart = curStart - 30 * 86400000
  let current = 0
  let previous = 0
  for (const a of applications) {
    if (a.status !== 'offer') continue
    const t = new Date(a.updated_at).getTime()
    if (t >= curStart && t < curEnd) current += 1
    else if (t >= prevStart && t < curStart) previous += 1
  }
  return { current, previous }
}

export type ActivityItem = {
  id: string
  title: string
  subtitle: string
  at: string
  tone: 'default' | 'success' | 'warning'
}

export function buildActivityFeed(
  applications: Application[],
  interviews: InterviewAssignmentRow[],
  maxItems = 14,
): ActivityItem[] {
  const items: ActivityItem[] = []
  const recentApps = [...applications]
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    .slice(0, 120)

  for (const app of recentApps) {
    const hist = [...(app.stage_history ?? [])].sort(
      (a, b) => new Date(b.changed_at).getTime() - new Date(a.changed_at).getTime(),
    )
    const latest = hist[0]
    if (latest) {
      items.push({
        id: `app-${app.id}-stage-${latest.changed_at}`,
        title: `Stage → ${formatDashboardLabel(latest.stage)}`,
        subtitle: `${app.candidate_name || app.candidate_email} · Application`,
        at: latest.changed_at,
        tone: latest.stage === 'hired' ? 'success' : latest.stage === 'rejected' ? 'warning' : 'default',
      })
    } else {
      items.push({
        id: `app-${app.id}-created`,
        title: 'Candidate applied',
        subtitle: `${app.candidate_name || app.candidate_email}`,
        at: app.created_at,
        tone: 'default',
      })
    }
  }

  for (const row of interviews) {
    if (row.scheduled_at && (row.status === 'scheduled' || row.status === 'pending')) {
      items.push({
        id: `int-${row.id}-sched`,
        title: 'Interview scheduled',
        subtitle: `${row.application?.candidate_name || row.application?.candidate_email || 'Candidate'} · ${row.job?.title ?? 'Job'}`,
        at: row.scheduled_at,
        tone: 'default',
      })
    }
  }

  items.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
  const seen = new Set<string>()
  const deduped: ActivityItem[] = []
  for (const it of items) {
    if (seen.has(it.id)) continue
    seen.add(it.id)
    deduped.push(it)
    if (deduped.length >= maxItems) break
  }
  return deduped
}

export function funnelCountsFromApplications(applications: Application[]) {
  const byStatus = applications.reduce<Record<string, number>>((acc, a) => {
    acc[a.status] = (acc[a.status] ?? 0) + 1
    return acc
  }, {})
  return PIPELINE_FUNNEL_KEYS.map(key => ({
    key,
    label: formatDashboardLabel(key),
    value: byStatus[key] ?? 0,
  }))
}

export function topJobsByApplicants(jobs: Job[], applications: Application[], limit = 8) {
  const byJob = applications.reduce<Record<number, number>>((acc, a) => {
    acc[a.job_id] = (acc[a.job_id] ?? 0) + 1
    return acc
  }, {})
  return [...jobs]
    .map(j => ({ job: j, count: byJob[j.id] ?? 0 }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit)
}

export function dominantStageForJob(jobId: number, applications: Application[]): string | null {
  const counts = applications
    .filter(a => a.job_id === jobId)
    .reduce<Record<string, number>>((acc, a) => {
      acc[a.status] = (acc[a.status] ?? 0) + 1
      return acc
    }, {})
  let best: string | null = null
  let bestN = 0
  for (const [k, n] of Object.entries(counts)) {
    if (n > bestN) {
      bestN = n
      best = k
    }
  }
  return best
}
