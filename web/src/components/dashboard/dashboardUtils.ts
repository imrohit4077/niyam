import type { Application } from '../../api/applications'
import type { InterviewAssignmentRow } from '../../api/interviews'
import type { Job } from '../../api/jobs'
import {
  DASHBOARD_CHART_COLORS,
  type PipelineFunnelStage,
} from './dashboardConstants'

export type DashboardSlice = {
  key: string
  label: string
  value: number
  color: string
}

export type ActivityFeedItem = {
  id: string
  kind: 'application' | 'interview' | 'hire' | 'offer'
  title: string
  subtitle: string
  at: string
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

export type TrendDirection = 'up' | 'down' | 'flat'

export type TrendResult = {
  direction: TrendDirection
  label: string
  /** 0–100 when both periods comparable; null when not meaningful */
  percent: number | null
}

/**
 * Compare two period counts into a compact trend label (↑ 12%).
 * When previous is 0 and current > 0, surfaces as strong up without fake infinity.
 */
export function computeTrend(current: number, previous: number): TrendResult {
  if (current === previous) {
    return { direction: 'flat', label: '0%', percent: 0 }
  }
  if (previous === 0) {
    if (current === 0) return { direction: 'flat', label: '0%', percent: 0 }
    return { direction: 'up', label: 'new', percent: null }
  }
  const raw = Math.round(((current - previous) / previous) * 100)
  const capped = Math.min(999, Math.max(-999, raw))
  const direction: TrendDirection = capped > 0 ? 'up' : capped < 0 ? 'down' : 'flat'
  const sign = capped > 0 ? '+' : ''
  return { direction, label: `${sign}${capped}%`, percent: Math.abs(capped) }
}

function inRange(iso: string, start: Date, end: Date) {
  const t = new Date(iso).getTime()
  return t >= start.getTime() && t < end.getTime()
}

/** Last 30 days vs the 30 days before that (by `created_at`). */
export function trendFromCreatedAt(rows: { created_at: string }[]): TrendResult {
  const now = new Date()
  const endRecent = now
  const startRecent = new Date(now)
  startRecent.setDate(startRecent.getDate() - 30)
  const endPrior = startRecent
  const startPrior = new Date(startRecent)
  startPrior.setDate(startPrior.getDate() - 30)

  const recent = rows.filter(r => inRange(r.created_at, startRecent, endRecent)).length
  const prior = rows.filter(r => inRange(r.created_at, startPrior, endPrior)).length
  return computeTrend(recent, prior)
}

/** Open roles first published (or created) in each 30-day window — hiring momentum proxy */
export function trendPublishedOpenJobs(jobs: Job[]): TrendResult {
  const now = new Date()
  const startRecent = new Date(now)
  startRecent.setDate(startRecent.getDate() - 30)
  const endPrior = startRecent
  const startPrior = new Date(startRecent)
  startPrior.setDate(startPrior.getDate() - 30)

  const stamp = (j: Job) => j.published_at || j.created_at
  const recent = jobs.filter(
    j => j.status === 'open' && stamp(j) && inRange(stamp(j)!, startRecent, now),
  ).length
  const prior = jobs.filter(
    j => j.status === 'open' && stamp(j) && inRange(stamp(j)!, startPrior, endPrior),
  ).length
  return computeTrend(recent, prior)
}

export function trendInterviewsScheduled(rows: InterviewAssignmentRow[]): TrendResult {
  const now = new Date()
  const startRecent = new Date(now)
  startRecent.setDate(startRecent.getDate() - 30)
  const endPrior = startRecent
  const startPrior = new Date(startRecent)
  startPrior.setDate(startPrior.getDate() - 30)

  const withTime = rows.filter(r => r.scheduled_at)
  const recent = withTime.filter(r => inRange(r.scheduled_at!, startRecent, now)).length
  const prior = withTime.filter(r => inRange(r.scheduled_at!, startPrior, endPrior)).length
  return computeTrend(recent, prior)
}

/** Offers touched in period (status offer, by updated_at). */
export function trendOffersActivity(applications: Application[]): TrendResult {
  const now = new Date()
  const startRecent = new Date(now)
  startRecent.setDate(startRecent.getDate() - 30)
  const endPrior = startRecent
  const startPrior = new Date(startRecent)
  startPrior.setDate(startPrior.getDate() - 30)

  const offerApps = applications.filter(a => a.status === 'offer')
  const recent = offerApps.filter(a => inRange(a.updated_at, startRecent, now)).length
  const prior = offerApps.filter(a => inRange(a.updated_at, startPrior, endPrior)).length
  return computeTrend(recent, prior)
}

export function workspacePipelineFunnelCounts(applications: Application[]): Record<PipelineFunnelStage, number> {
  const base: Record<PipelineFunnelStage, number> = {
    applied: 0,
    screening: 0,
    interview: 0,
    offer: 0,
    hired: 0,
  }
  for (const a of applications) {
    const s = a.status as string
    if (s in base) base[s as PipelineFunnelStage] += 1
  }
  return base
}

export function workspaceSourceSlices(applications: Application[]) {
  return makeDashboardSlices(
    Object.entries(
      applications.reduce<Record<string, number>>((acc, application) => {
        const source = application.source_type || 'unknown'
        acc[source] = (acc[source] ?? 0) + 1
        return acc
      }, {}),
    ),
  )
}

export function applicantsPerJobSeries(jobs: Job[], applications: Application[]) {
  const byJob = applications.reduce<Record<number, number>>((acc, a) => {
    acc[a.job_id] = (acc[a.job_id] ?? 0) + 1
    return acc
  }, {})
  const pairs = jobs.map(j => ({ title: j.title, count: byJob[j.id] ?? 0 }))
  pairs.sort((a, b) => b.count - a.count)
  const top = pairs.slice(0, 8)
  return {
    labels: top.map(p => (p.title.length > 28 ? `${p.title.slice(0, 26)}…` : p.title)),
    counts: top.map(p => p.count),
  }
}

export function dominantPipelineStage(jobApplications: Application[]): string {
  const byStatus = jobApplications.reduce<Record<string, number>>((acc, a) => {
    acc[a.status] = (acc[a.status] ?? 0) + 1
    return acc
  }, {})
  let best = ''
  let bestN = 0
  for (const [k, v] of Object.entries(byStatus)) {
    if (v > bestN) {
      best = k
      bestN = v
    }
  }
  return best ? formatDashboardLabel(best) : '—'
}

export function buildActivityFeed(
  applications: Application[],
  interviews: InterviewAssignmentRow[],
  limit = 12,
): ActivityFeedItem[] {
  type Raw = { at: string; item: ActivityFeedItem }
  const raw: Raw[] = []

  for (const a of applications) {
    raw.push({
      at: a.created_at,
      item: {
        id: `app-${a.id}-c`,
        kind: 'application',
        title: `Candidate added: ${a.candidate_name || a.candidate_email}`,
        subtitle: `Application · ${formatDashboardLabel(a.status)}`,
        at: a.created_at,
      },
    })
    if (a.status === 'hired') {
      raw.push({
        at: a.updated_at,
        item: {
          id: `app-${a.id}-h`,
          kind: 'hire',
          title: `Hired: ${a.candidate_name || a.candidate_email}`,
          subtitle: 'Candidate marked hired',
          at: a.updated_at,
        },
      })
    }
    if (a.status === 'offer' && a.updated_at !== a.created_at) {
      raw.push({
        at: a.updated_at,
        item: {
          id: `app-${a.id}-o`,
          kind: 'offer',
          title: `Offer stage: ${a.candidate_name || a.candidate_email}`,
          subtitle: 'Pipeline update',
          at: a.updated_at,
        },
      })
    }
  }

  for (const row of interviews) {
    if (row.scheduled_at && (row.status === 'scheduled' || row.status === 'pending')) {
      raw.push({
        at: row.scheduled_at,
        item: {
          id: `int-${row.id}`,
          kind: 'interview',
          title: `Interview scheduled: ${row.application?.candidate_name || row.application?.candidate_email || 'Candidate'}`,
          subtitle: row.job?.title ? row.job.title : 'Interview',
          at: row.scheduled_at,
        },
      })
    }
  }

  raw.sort((x, y) => new Date(y.at).getTime() - new Date(x.at).getTime())
  const seen = new Set<string>()
  const out: ActivityFeedItem[] = []
  for (const { item } of raw) {
    if (seen.has(item.id)) continue
    seen.add(item.id)
    out.push(item)
    if (out.length >= limit) break
  }
  return out
}
