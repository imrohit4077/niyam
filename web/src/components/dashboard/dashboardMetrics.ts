import type { Application } from '../../api/applications'
import type { InterviewAssignmentRow } from '../../api/interviews'
import type { Job } from '../../api/jobs'
import type { DashboardTrend } from './DashboardKpiCard'

const MS_DAY = 86_400_000

export function uniqueCandidateCount(applications: Application[]): number {
  const emails = new Set(applications.map(a => a.candidate_email.toLowerCase().trim()).filter(Boolean))
  return emails.size
}

/** Count items whose `dateField` falls in [start, end). */
export function countInDateRange<T>(
  items: T[],
  getDate: (item: T) => string | null | undefined,
  start: Date,
  end: Date,
): number {
  const a = start.getTime()
  const b = end.getTime()
  return items.filter(item => {
    const raw = getDate(item)
    if (!raw) return false
    const t = new Date(raw).getTime()
    return t >= a && t < b
  }).length
}

export function trendFromPeriods(current: number, previous: number): DashboardTrend | null {
  if (current === 0 && previous === 0) return null
  if (previous === 0) {
    return { direction: current > 0 ? 'up' : 'flat', label: current > 0 ? 'New' : '0%' }
  }
  const pct = Math.round(((current - previous) / previous) * 100)
  if (pct === 0) return { direction: 'flat', label: '0%' }
  if (pct > 0) return { direction: 'up', label: `${pct}%` }
  return { direction: 'down', label: `${Math.abs(pct)}%` }
}

export function applicationVolumeTrend(applications: Application[], windowDays = 28): DashboardTrend | null {
  const now = Date.now()
  const curStart = new Date(now - windowDays * MS_DAY)
  const prevStart = new Date(now - 2 * windowDays * MS_DAY)
  const prevEnd = curStart
  const current = countInDateRange(applications, a => a.created_at, curStart, new Date(now))
  const previous = countInDateRange(applications, a => a.created_at, prevStart, prevEnd)
  return trendFromPeriods(current, previous)
}

export function openJobsTrend(jobs: Job[], windowDays = 28): DashboardTrend | null {
  const now = Date.now()
  const curStart = new Date(now - windowDays * MS_DAY)
  const prevStart = new Date(now - 2 * windowDays * MS_DAY)
  const prevEnd = curStart
  /** Jobs that became open during the window (status is open and opened recently). */
  const openedInRange = (j: Job, start: Date, end: Date) =>
    j.status === 'open' && new Date(j.created_at).getTime() >= start.getTime() && new Date(j.created_at).getTime() < end.getTime()
  const current = jobs.filter(j => openedInRange(j, curStart, new Date(now))).length
  const previous = jobs.filter(j => openedInRange(j, prevStart, prevEnd)).length
  return trendFromPeriods(current, previous)
}

/** First application timestamp per candidate email (workspace-wide). */
function firstApplicationAtByEmail(applications: Application[]): Map<string, number> {
  const map = new Map<string, number>()
  for (const a of applications) {
    const email = a.candidate_email.toLowerCase().trim()
    if (!email) continue
    const t = new Date(a.created_at).getTime()
    const prev = map.get(email)
    if (prev == null || t < prev) map.set(email, t)
  }
  return map
}

export function newCandidatesTrend(applications: Application[], windowDays = 28): DashboardTrend | null {
  const now = Date.now()
  const curStart = new Date(now - windowDays * MS_DAY)
  const prevStart = new Date(now - 2 * windowDays * MS_DAY)
  const prevEnd = curStart
  const firstAt = firstApplicationAtByEmail(applications)
  let current = 0
  let previous = 0
  for (const t of firstAt.values()) {
    if (t >= curStart.getTime() && t < now) current += 1
    else if (t >= prevStart.getTime() && t < prevEnd.getTime()) previous += 1
  }
  return trendFromPeriods(current, previous)
}

export function interviewsScheduledTrend(rows: InterviewAssignmentRow[], windowDays = 28): DashboardTrend | null {
  const now = Date.now()
  const curStart = new Date(now - windowDays * MS_DAY)
  const prevStart = new Date(now - 2 * windowDays * MS_DAY)
  const prevEnd = curStart
  const scheduled = (r: InterviewAssignmentRow) =>
    r.scheduled_at && (r.status === 'scheduled' || r.status === 'pending')
  const current = countInDateRange(
    rows.filter(scheduled),
    r => r.scheduled_at,
    curStart,
    new Date(now),
  )
  const previous = countInDateRange(
    rows.filter(scheduled),
    r => r.scheduled_at,
    prevStart,
    prevEnd,
  )
  return trendFromPeriods(current, previous)
}

export function offersReleasedTrend(applications: Application[], windowDays = 28): DashboardTrend | null {
  const now = Date.now()
  const curStart = new Date(now - windowDays * MS_DAY)
  const prevStart = new Date(now - 2 * windowDays * MS_DAY)
  const prevEnd = curStart
  const offerApps = applications.filter(a => a.status === 'offer')
  const current = countInDateRange(offerApps, a => a.updated_at, curStart, new Date(now))
  const previous = countInDateRange(offerApps, a => a.updated_at, prevStart, prevEnd)
  return trendFromPeriods(current, previous)
}

const PIPELINE_ORDER = ['applied', 'screening', 'interview', 'offer', 'hired'] as const

export function workspacePipelineCounts(applications: Application[]): Record<string, number> {
  const base: Record<string, number> = {
    applied: 0,
    screening: 0,
    interview: 0,
    offer: 0,
    hired: 0,
  }
  for (const a of applications) {
    const s = a.status
    if (s in base) base[s] += 1
  }
  return base
}

export function pipelineFunnelChartData(counts: Record<string, number>) {
  const labels = PIPELINE_ORDER.map(k => k.charAt(0).toUpperCase() + k.slice(1))
  const data = PIPELINE_ORDER.map(k => counts[k] ?? 0)
  const colors = ['#38bdf8', '#3b82f6', '#6366f1', '#a855f7', '#10b981']
  return { labels, data, colors }
}

export function topJobsByApplicants(
  applications: Application[],
  jobs: Job[],
  limit = 8,
): { job: Job; count: number }[] {
  const byJob = applications.reduce<Record<number, number>>((acc, a) => {
    acc[a.job_id] = (acc[a.job_id] ?? 0) + 1
    return acc
  }, {})
  const jobById = new Map(jobs.map(j => [j.id, j]))
  return Object.entries(byJob)
    .map(([id, count]) => ({ job: jobById.get(Number(id)), count }))
    .filter((row): row is { job: Job; count: number } => !!row.job)
    .sort((a, b) => b.count - a.count)
    .slice(0, limit)
}

export function workspaceSourceSlices(applications: Application[]) {
  const acc: Record<string, number> = {}
  for (const a of applications) {
    const key = a.source_type || 'unknown'
    acc[key] = (acc[key] ?? 0) + 1
  }
  return Object.entries(acc)
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1])
}
