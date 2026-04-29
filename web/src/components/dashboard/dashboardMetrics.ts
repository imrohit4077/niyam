import type { Application } from '../../api/applications'
import type { InterviewAssignmentRow } from '../../api/interviews'
import type { Job } from '../../api/jobs'

export type TrendDirection = 'up' | 'down' | 'flat'

export type TrendIndicator = {
  direction: TrendDirection
  label: string
}

const DAY_MS = 86_400_000

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

export function formatRelativeTime(value: string, nowMs: number) {
  const d = new Date(value)
  const diff = nowMs - d.getTime()
  if (diff < 60_000) return 'Just now'
  if (diff < 3600_000) return `${Math.floor(diff / 60_000)}m ago`
  if (diff < 86400_000) return `${Math.floor(diff / 3600_000)}h ago`
  if (diff < 7 * 86400_000) return `${Math.floor(diff / 86400_000)}d ago`
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function trendFromCounts(current: number, previous: number): TrendIndicator {
  if (previous === 0 && current === 0) return { direction: 'flat', label: '0%' }
  if (previous === 0) return { direction: 'up', label: 'New' }
  const pct = Math.round(((current - previous) / previous) * 100)
  if (pct > 0) return { direction: 'up', label: `+${pct}%` }
  if (pct < 0) return { direction: 'down', label: `${pct}%` }
  return { direction: 'flat', label: '0%' }
}

function inWindow(ts: number, start: number, end: number) {
  return ts >= start && ts < end
}

/** Count items whose date string falls in [start, end). */
export function countInDateRange<T>(items: T[], getDate: (item: T) => string | null | undefined, start: number, end: number) {
  let n = 0
  for (const item of items) {
    const raw = getDate(item)
    if (!raw) continue
    const ts = new Date(raw).getTime()
    if (Number.isNaN(ts)) continue
    if (inWindow(ts, start, end)) n += 1
  }
  return n
}

export function twoPeriodTrend<T>(
  items: T[],
  getDate: (item: T) => string | null | undefined,
  nowMs: number,
  windowDays = 30,
): TrendIndicator {
  const w = windowDays * DAY_MS
  const curStart = nowMs - w
  const prevStart = nowMs - 2 * w
  const prevEnd = curStart
  const current = countInDateRange(items, getDate, curStart, nowMs)
  const previous = countInDateRange(items, getDate, prevStart, prevEnd)
  return trendFromCounts(current, previous)
}

export function computeOffersReleasedTrend(applications: Application[], nowMs: number): TrendIndicator {
  const w = 30 * DAY_MS
  const inRange = (d: string, start: number, end: number) => {
    const t = new Date(d).getTime()
    return !Number.isNaN(t) && t >= start && t < end
  }
  const isOfferish = (a: Application) => a.status === 'offer' || a.status === 'hired'
  const cur = applications.filter(a => isOfferish(a) && inRange(a.updated_at, nowMs - w, nowMs)).length
  const prev = applications.filter(a => isOfferish(a) && inRange(a.updated_at, nowMs - 2 * w, nowMs - w)).length
  return trendFromCounts(cur, prev)
}

export const PIPELINE_FUNNEL_STAGES = ['applied', 'screening', 'interview', 'offer', 'hired'] as const

export type PipelineStage = (typeof PIPELINE_FUNNEL_STAGES)[number]

export function funnelCountsFromApplications(applications: Application[]) {
  const counts: Record<PipelineStage, number> = {
    applied: 0,
    screening: 0,
    interview: 0,
    offer: 0,
    hired: 0,
  }
  for (const a of applications) {
    const s = a.status as string
    if (s in counts) counts[s as PipelineStage] += 1
  }
  return PIPELINE_FUNNEL_STAGES.map(stage => ({
    stage,
    label: formatDashboardLabel(stage),
    count: counts[stage],
  }))
}

export type ActivityItem = {
  id: string
  kind: 'candidate' | 'interview' | 'offer' | 'hire' | 'job'
  title: string
  subtitle: string
  at: string
}

export function buildActivityFeed(
  applications: Application[],
  interviews: InterviewAssignmentRow[],
  jobs: Job[],
  nowMs: number,
  limit = 12,
): ActivityItem[] {
  const out: ActivityItem[] = []

  for (const a of applications) {
    const name = a.candidate_name || a.candidate_email
    const job = jobs.find(j => j.id === a.job_id)
    const jobTitle = job?.title ?? `Job #${a.job_id}`
    out.push({
      id: `app-new-${a.id}`,
      kind: 'candidate',
      title: `New application · ${name}`,
      subtitle: jobTitle,
      at: a.created_at,
    })
    if (a.status === 'hired') {
      out.push({
        id: `app-hired-${a.id}`,
        kind: 'hire',
        title: `${name} marked hired`,
        subtitle: jobTitle,
        at: a.updated_at,
      })
    } else if (a.status === 'offer') {
      out.push({
        id: `app-offer-${a.id}`,
        kind: 'offer',
        title: `Offer stage · ${name}`,
        subtitle: jobTitle,
        at: a.updated_at,
      })
    }
  }

  for (const row of interviews) {
    const name = row.application?.candidate_name || row.application?.candidate_email || 'Candidate'
    const jobTitle = row.job?.title ?? 'Interview'
    if (row.scheduled_at && (row.status === 'scheduled' || row.status === 'pending')) {
      out.push({
        id: `int-${row.id}`,
        kind: 'interview',
        title: `Interview scheduled · ${name}`,
        subtitle: jobTitle,
        at: row.scheduled_at,
      })
    }
  }

  const recentJobMs = 14 * DAY_MS
  for (const j of jobs) {
    const t = new Date(j.updated_at).getTime()
    if (nowMs - t > recentJobMs) continue
    out.push({
      id: `job-${j.id}`,
      kind: 'job',
      title: `Job updated · ${j.title}`,
      subtitle: formatDashboardLabel(j.status),
      at: j.updated_at,
    })
  }

  out.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
  return out.slice(0, limit)
}

export function dominantApplicantStage(jobApplications: Application[]): string {
  const by = jobApplications.reduce<Record<string, number>>((acc, a) => {
    acc[a.status] = (acc[a.status] ?? 0) + 1
    return acc
  }, {})
  let best = ''
  let max = 0
  for (const [k, v] of Object.entries(by)) {
    if (v > max) {
      max = v
      best = k
    }
  }
  return best ? formatDashboardLabel(best) : '—'
}
