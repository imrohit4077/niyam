import type { Application } from '../../api/applications'
import type { InterviewAssignmentRow } from '../../api/interviews'

const MS_DAY = 86_400_000

export type TrendDirection = 'up' | 'down' | 'flat'

export type TrendResult = {
  direction: TrendDirection
  /** Whole-number percent change vs prior period; null if not meaningful. */
  pct: number | null
  label: string
}

function pctChange(current: number, previous: number): number | null {
  if (previous === 0 && current === 0) return null
  if (previous === 0) return current > 0 ? 100 : null
  return Math.round(((current - previous) / previous) * 100)
}

function trendFromCounts(current: number, previous: number): TrendResult {
  const pct = pctChange(current, previous)
  if (pct == null) return { direction: 'flat', pct: null, label: '—' }
  const direction: TrendDirection = pct > 0 ? 'up' : pct < 0 ? 'down' : 'flat'
  const sign = pct > 0 ? '+' : ''
  return { direction, pct, label: `${sign}${pct}%` }
}

export function applicationsCreatedInRange(applications: Application[], start: Date, end: Date) {
  const t0 = start.getTime()
  const t1 = end.getTime()
  return applications.filter(a => {
    const t = new Date(a.created_at).getTime()
    return t >= t0 && t < t1
  }).length
}

export function offersTouchingRange(applications: Application[], start: Date, end: Date) {
  const t0 = start.getTime()
  const t1 = end.getTime()
  return applications.filter(a => {
    if (a.status !== 'offer') return false
    const t = new Date(a.updated_at).getTime()
    return t >= t0 && t < t1
  }).length
}

/** Interviews with a scheduled time falling in [start, end). */
export function interviewsScheduledInRange(rows: InterviewAssignmentRow[], start: Date, end: Date) {
  const t0 = start.getTime()
  const t1 = end.getTime()
  return rows.filter(row => {
    if (row.status !== 'scheduled' && row.status !== 'pending') return false
    const raw = row.scheduled_at
    if (!raw) return false
    const t = new Date(raw).getTime()
    return t >= t0 && t < t1
  }).length
}

/** Compare last 30 days vs the prior 30 days. */
export function trendApplicationsCreated(applications: Application[]): TrendResult {
  const now = Date.now()
  const curStart = new Date(now - 30 * MS_DAY)
  const prevStart = new Date(now - 60 * MS_DAY)
  const prevEnd = curStart
  const cur = applicationsCreatedInRange(applications, curStart, new Date(now))
  const prev = applicationsCreatedInRange(applications, prevStart, prevEnd)
  return trendFromCounts(cur, prev)
}

export function trendOffers(applications: Application[]): TrendResult {
  const now = Date.now()
  const curStart = new Date(now - 30 * MS_DAY)
  const prevStart = new Date(now - 60 * MS_DAY)
  const cur = offersTouchingRange(applications, curStart, new Date(now))
  const prev = offersTouchingRange(applications, prevStart, curStart)
  return trendFromCounts(cur, prev)
}

export function trendInterviewsScheduled(rows: InterviewAssignmentRow[]): TrendResult {
  const now = Date.now()
  const curStart = new Date(now - 30 * MS_DAY)
  const prevStart = new Date(now - 60 * MS_DAY)
  const cur = interviewsScheduledInRange(rows, curStart, new Date(now))
  const prev = interviewsScheduledInRange(rows, prevStart, curStart)
  return trendFromCounts(cur, prev)
}

/** Open roles: compare jobs currently open vs total (activity proxy — no history). */
export function trendOpenJobsShare(openCount: number, totalJobs: number): TrendResult {
  if (totalJobs === 0) return { direction: 'flat', pct: null, label: '—' }
  const pct = Math.round((openCount / totalJobs) * 100)
  return { direction: 'flat', pct, label: `${pct}% open` }
}

export const FUNNEL_STAGES = ['applied', 'screening', 'interview', 'offer', 'hired'] as const
export type FunnelStage = (typeof FUNNEL_STAGES)[number]

export const FUNNEL_LABELS: Record<FunnelStage, string> = {
  applied: 'Applied',
  screening: 'Screening',
  interview: 'Interview',
  offer: 'Offer',
  hired: 'Hired',
}

export function funnelCountsFromApplications(applications: Application[]): Record<FunnelStage, number> {
  const base: Record<FunnelStage, number> = {
    applied: 0,
    screening: 0,
    interview: 0,
    offer: 0,
    hired: 0,
  }
  for (const a of applications) {
    const s = a.status as string
    if (s in base) base[s as FunnelStage] += 1
  }
  return base
}

export function applicantsPerJob(applications: Application[], jobs: { id: number; title: string }[]) {
  const byJob: Record<number, number> = {}
  for (const a of applications) {
    byJob[a.job_id] = (byJob[a.job_id] ?? 0) + 1
  }
  return jobs
    .map(j => ({ jobId: j.id, title: j.title, count: byJob[j.id] ?? 0 }))
    .filter(row => row.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 12)
}

export function formatDashboardLabel(value: string) {
  return value.replace(/_/g, ' ').replace(/\b\w/g, ch => ch.toUpperCase())
}

export function dominantApplicantStage(applications: Application[]): string | null {
  if (applications.length === 0) return null
  const tally: Record<string, number> = {}
  for (const a of applications) {
    tally[a.status] = (tally[a.status] ?? 0) + 1
  }
  let best = ''
  let n = 0
  for (const [k, v] of Object.entries(tally)) {
    if (v > n) {
      n = v
      best = k
    }
  }
  return best || null
}
