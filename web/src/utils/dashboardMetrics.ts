import type { Application } from '../api/applications'
import type { InterviewAssignmentRow } from '../api/interviews'
import type { Job } from '../api/jobs'

export const FUNNEL_STATUSES = ['applied', 'screening', 'interview', 'offer', 'hired'] as const

export type TrendDirection = 'up' | 'down' | 'flat'

export type TrendIndicator = {
  direction: TrendDirection
  /** e.g. "+12%" or "0%" */
  label: string
  /** Short comparison line for tooltips / subtitles */
  caption: string
}

const DAY_MS = 86_400_000

function parseIso(iso: string): number {
  return new Date(iso).getTime()
}

function inRange(iso: string, start: number, end: number): boolean {
  const t = parseIso(iso)
  return t >= start && t < end
}

/** Last `days` vs the prior `days` period (non-overlapping). */
export function comparePeriods(days: number): { currentStart: number; currentEnd: number; prevStart: number; prevEnd: number } {
  const currentEnd = Date.now()
  const currentStart = currentEnd - days * DAY_MS
  const prevEnd = currentStart
  const prevStart = prevEnd - days * DAY_MS
  return { currentStart, currentEnd, prevStart, prevEnd }
}

export function trendFromCounts(current: number, previous: number): TrendIndicator {
  if (previous === 0 && current === 0) {
    return { direction: 'flat', label: '0%', caption: 'vs prior period' }
  }
  if (previous === 0) {
    return { direction: 'up', label: '+100%', caption: 'vs prior period' }
  }
  const rawPct = Math.round(((current - previous) / previous) * 100)
  const direction: TrendDirection = rawPct > 0 ? 'up' : rawPct < 0 ? 'down' : 'flat'
  const sign = rawPct > 0 ? '+' : ''
  return {
    direction,
    label: `${sign}${rawPct}%`,
    caption: 'vs prior 30 days',
  }
}

export function countApplicationsCreatedInRange(applications: Application[], start: number, end: number): number {
  return applications.filter(a => inRange(a.created_at, start, end)).length
}

/** New jobs created in range (proxy for hiring activity). */
export function countJobsCreatedInRange(jobs: Job[], start: number, end: number): number {
  return jobs.filter(j => inRange(j.created_at, start, end)).length
}

export function countInterviewsScheduledInRange(rows: InterviewAssignmentRow[], start: number, end: number): number {
  return rows.filter(row => row.scheduled_at && inRange(row.scheduled_at, start, end)).length
}

/** Applications in offer stage with activity in range (proxy for offers released). */
export function countOfferTouchesInRange(applications: Application[], start: number, end: number): number {
  return applications.filter(
    a => a.status === 'offer' && (inRange(a.updated_at, start, end) || inRange(a.created_at, start, end)),
  ).length
}

export function workspaceFunnelCounts(applications: Application[]): Record<(typeof FUNNEL_STATUSES)[number], number> {
  const base: Record<(typeof FUNNEL_STATUSES)[number], number> = {
    applied: 0,
    screening: 0,
    interview: 0,
    offer: 0,
    hired: 0,
  }
  for (const a of applications) {
    const s = a.status as keyof typeof base
    if (s in base) base[s] += 1
  }
  return base
}

export function applicantsPerJob(jobs: Job[], applications: Application[]): { jobId: number; title: string; count: number }[] {
  const counts = new Map<number, number>()
  for (const a of applications) {
    counts.set(a.job_id, (counts.get(a.job_id) ?? 0) + 1)
  }
  return jobs
    .map(j => ({ jobId: j.id, title: j.title, count: counts.get(j.id) ?? 0 }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 12)
}

export function workspaceSourceSlices(applications: Application[]): Array<{ key: string; label: string; value: number }> {
  const acc: Record<string, number> = {}
  for (const a of applications) {
    const key = a.source_type || 'unknown'
    acc[key] = (acc[key] ?? 0) + 1
  }
  return Object.entries(acc)
    .map(([key, value]) => ({
      key,
      label: key.replace(/_/g, ' ').replace(/\b\w/g, ch => ch.toUpperCase()),
      value,
    }))
    .filter(e => e.value > 0)
    .sort((a, b) => b.value - a.value)
}

export type ActivityItem = {
  id: string
  label: string
  detail: string
  at: string
  kind: 'application' | 'interview' | 'job'
}

export function buildActivityFeed(
  applications: Application[],
  interviews: InterviewAssignmentRow[],
  jobs: Job[],
  limit = 12,
): ActivityItem[] {
  const items: ActivityItem[] = []

  for (const a of applications) {
    items.push({
      id: `app-${a.id}`,
      kind: 'application',
      label: 'Candidate applied',
      detail: `${a.candidate_name || a.candidate_email} · Job #${a.job_id}`,
      at: a.created_at,
    })
  }

  for (const row of interviews) {
    const name = row.application?.candidate_name || row.application?.candidate_email || 'Candidate'
    const jobTitle = row.job?.title ?? `Job #${row.application?.job_id ?? '—'}`
    if (row.scheduled_at) {
      items.push({
        id: `int-${row.id}-sched`,
        kind: 'interview',
        label: 'Interview scheduled',
        detail: `${name} · ${jobTitle}`,
        at: row.scheduled_at,
      })
    } else {
      items.push({
        id: `int-${row.id}-up`,
        kind: 'interview',
        label: 'Interview updated',
        detail: `${name} · ${jobTitle}`,
        at: row.updated_at,
      })
    }
  }

  for (const j of jobs) {
    items.push({
      id: `job-${j.id}`,
      kind: 'job',
      label: 'Job updated',
      detail: `${j.title}`,
      at: j.updated_at,
    })
  }

  items.sort((x, y) => parseIso(y.at) - parseIso(x.at))
  return items.slice(0, limit)
}
