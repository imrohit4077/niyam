import type { Application } from '../../api/applications'
import type { Job } from '../../api/jobs'

export const PIPELINE_FUNNEL_STAGES = ['applied', 'screening', 'interview', 'offer', 'hired'] as const

export type PipelineStage = (typeof PIPELINE_FUNNEL_STAGES)[number]

const DAY_MS = 86_400_000

export function countInDateRange<T>(items: T[], getTime: (item: T) => number | null, start: number, end: number) {
  let n = 0
  for (const item of items) {
    const t = getTime(item)
    if (t == null) continue
    if (t >= start && t < end) n += 1
  }
  return n
}

export function twoWindowTrend(current: number, previous: number) {
  if (previous === 0) {
    if (current === 0) return { direction: 'flat' as const, pct: 0, label: '0%' }
    return { direction: 'up' as const, pct: 100, label: '+100%' }
  }
  const raw = Math.round(((current - previous) / previous) * 100)
  const direction = raw > 0 ? ('up' as const) : raw < 0 ? ('down' as const) : ('flat' as const)
  const sign = raw > 0 ? '+' : ''
  return { direction, pct: raw, label: `${sign}${raw}%` }
}

export function applicationsInWindows(applications: Application[], now = new Date()) {
  const end = now.getTime()
  const startCurrent = end - 30 * DAY_MS
  const startPrevious = end - 60 * DAY_MS
  const current = countInDateRange(applications, a => new Date(a.created_at).getTime(), startCurrent, end)
  const previous = countInDateRange(applications, a => new Date(a.created_at).getTime(), startPrevious, startCurrent)
  return { current, previous }
}

export function jobsCreatedInWindows(jobs: Job[], now = new Date()) {
  const end = now.getTime()
  const startCurrent = end - 30 * DAY_MS
  const startPrevious = end - 60 * DAY_MS
  const current = countInDateRange(jobs, j => new Date(j.created_at).getTime(), startCurrent, end)
  const previous = countInDateRange(jobs, j => new Date(j.created_at).getTime(), startPrevious, startCurrent)
  return { current, previous }
}

/** Open roles whose `created_at` falls in each window (proxy for hiring momentum). */
export function openJobsOpenedInWindows(jobs: Job[], now = new Date()) {
  const openOnly = jobs.filter(j => j.status === 'open')
  return jobsCreatedInWindows(openOnly, now)
}

export function interviewsScheduledInWindows(
  rows: { scheduled_at: string | null; created_at?: string }[],
  now = new Date(),
) {
  const end = now.getTime()
  const startCurrent = end - 30 * DAY_MS
  const startPrevious = end - 60 * DAY_MS
  const getTime = (row: { scheduled_at: string | null; created_at?: string }) => {
    if (row.scheduled_at) return new Date(row.scheduled_at).getTime()
    if (row.created_at) return new Date(row.created_at).getTime()
    return null
  }
  const current = countInDateRange(rows, getTime, startCurrent, end)
  const previous = countInDateRange(rows, getTime, startPrevious, startCurrent)
  return { current, previous }
}

/** Trend uses `updated_at` while status is offer (proxy for offers touched this period). */
export function offersReleasedInWindows(applications: Application[], now = new Date()) {
  const end = now.getTime()
  const startCurrent = end - 30 * DAY_MS
  const startPrevious = end - 60 * DAY_MS
  const inWindow = (a: Application, start: number, e: number) => {
    if (a.status !== 'offer') return false
    const t = new Date(a.updated_at).getTime()
    return t >= start && t < e
  }
  const current = applications.filter(a => inWindow(a, startCurrent, end)).length
  const previous = applications.filter(a => inWindow(a, startPrevious, startCurrent)).length
  return { current, previous }
}

export function funnelCountsFromApplications(applications: Application[]) {
  const byStatus = applications.reduce<Record<string, number>>((acc, a) => {
    acc[a.status] = (acc[a.status] ?? 0) + 1
    return acc
  }, {})
  return PIPELINE_FUNNEL_STAGES.map(stage => byStatus[stage] ?? 0)
}

export function applicantsPerJob(applications: Application[], jobs: Job[], limit = 10) {
  const counts = new Map<number, number>()
  for (const a of applications) counts.set(a.job_id, (counts.get(a.job_id) ?? 0) + 1)
  const rows = jobs
    .map(job => ({ job, n: counts.get(job.id) ?? 0 }))
    .filter(r => r.n > 0)
    .sort((a, b) => b.n - a.n)
    .slice(0, limit)
  return rows
}

export function sourceSlicesFromApplications(applications: Application[], colors: string[]) {
  const bySource = applications.reduce<Record<string, number>>((acc, a) => {
    const key = a.source_type || 'unknown'
    acc[key] = (acc[key] ?? 0) + 1
    return acc
  }, {})
  return Object.entries(bySource)
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([label, value], i) => ({
      key: label,
      label: label.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
      value,
      color: colors[i % colors.length],
    }))
}

export function dominantApplicationStatus(applications: Application[]) {
  if (applications.length === 0) return null
  const tally = applications.reduce<Record<string, number>>((acc, a) => {
    acc[a.status] = (acc[a.status] ?? 0) + 1
    return acc
  }, {})
  let best: string | null = null
  let bestN = 0
  for (const [k, v] of Object.entries(tally)) {
    if (v > bestN) {
      best = k
      bestN = v
    }
  }
  return best
}

export function formatStageLabel(value: string) {
  return value.replace(/_/g, ' ').replace(/\b\w/g, ch => ch.toUpperCase())
}
