import type { Application } from '../api/applications'
import type { InterviewAssignmentRow } from '../api/interviews'

/** Rolling-window comparison: recent window vs previous equal-length window. */
export function rollingTrend(counts: { recent: number; previous: number }): {
  direction: 'up' | 'down' | 'flat'
  percent: number
} {
  const { recent, previous } = counts
  if (previous === 0 && recent === 0) return { direction: 'flat', percent: 0 }
  if (previous === 0) return { direction: 'up', percent: 100 }
  const raw = ((recent - previous) / previous) * 100
  const percent = Math.min(999, Math.round(Math.abs(raw)))
  if (raw > 0.5) return { direction: 'up', percent }
  if (raw < -0.5) return { direction: 'down', percent }
  return { direction: 'flat', percent: 0 }
}

export function applicationsInRollingWindows(applications: Application[], windowDays: number) {
  const now = Date.now()
  const ms = windowDays * 24 * 60 * 60 * 1000
  let recent = 0
  let previous = 0
  for (const a of applications) {
    const t = new Date(a.created_at).getTime()
    if (t > now - ms) recent += 1
    else if (t > now - 2 * ms && t <= now - ms) previous += 1
  }
  return { recent, previous }
}

export function activeJobsTrend(openNow: number, jobsClosedLastPeriod: number, jobsOpenedLastPeriod: number) {
  const net = jobsOpenedLastPeriod - jobsClosedLastPeriod
  const denom = Math.max(1, openNow - net)
  const raw = (net / denom) * 100
  const percent = Math.min(999, Math.round(Math.abs(raw)))
  if (net > 0) return { direction: 'up' as const, percent: Math.max(percent, 1) }
  if (net < 0) return { direction: 'down' as const, percent: Math.max(percent, 1) }
  return { direction: 'flat' as const, percent: 0 }
}

export function countScheduledInterviews(rows: InterviewAssignmentRow[]) {
  return rows.filter(r => r.status === 'scheduled' || r.status === 'pending' || !!r.scheduled_at).length
}

export function interviewsTrend(current: number, previous: number) {
  return rollingTrend({ recent: current, previous })
}

const PIPELINE_ORDER = ['applied', 'screening', 'interview', 'offer', 'hired'] as const

export function workspacePipelineFunnel(applications: Application[]) {
  const counts: Record<string, number> = {}
  for (const k of PIPELINE_ORDER) counts[k] = 0
  for (const a of applications) {
    const s = a.status
    if (s in counts) counts[s] += 1
  }
  return PIPELINE_ORDER.map(key => ({
    key,
    label: key.charAt(0).toUpperCase() + key.slice(1),
    value: counts[key] ?? 0,
  }))
}

export type ActivityKind = 'application' | 'interview' | 'offer'

export interface FeedItem {
  id: string
  kind: ActivityKind
  title: string
  meta: string
  at: string
}

export function buildActivityFeed(params: {
  applications: Application[]
  interviews: InterviewAssignmentRow[]
  limit?: number
}): FeedItem[] {
  const limit = params.limit ?? 14
  const items: FeedItem[] = []

  for (const a of params.applications) {
    items.push({
      id: `app-${a.id}`,
      kind: 'application',
      title: `${a.candidate_name || a.candidate_email || 'Candidate'} applied`,
      meta: `Application · ${formatDashboardStatus(a.status)}`,
      at: a.created_at,
    })
    if (a.status === 'offer') {
      items.push({
        id: `offer-${a.id}`,
        kind: 'offer',
        title: `Offer stage · ${a.candidate_name || a.candidate_email || 'Candidate'}`,
        meta: `Pipeline · ${formatDashboardStatus(a.status)}`,
        at: a.updated_at,
      })
    }
  }

  for (const row of params.interviews) {
    const name = row.application?.candidate_name || row.application?.candidate_email || 'Candidate'
    const jobTitle = row.job?.title ?? 'Role'
    items.push({
      id: `int-${row.id}`,
      kind: 'interview',
      title:
        row.scheduled_at != null
          ? `Interview scheduled · ${name}`
          : `Interview · ${name}`,
      meta: `${jobTitle} · ${formatDashboardStatus(row.status)}`,
      at: row.scheduled_at || row.updated_at,
    })
  }

  items.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())

  return items.slice(0, limit)
}

function formatDashboardStatus(value: string) {
  return value.replace(/_/g, ' ').replace(/\b\w/g, ch => ch.toUpperCase())
}

export function applicationsWithStatusInRollingWindows(
  applications: Application[],
  status: string,
  windowDays: number,
  useField: 'created_at' | 'updated_at' = 'updated_at',
) {
  const now = Date.now()
  const ms = windowDays * 24 * 60 * 60 * 1000
  let recent = 0
  let previous = 0
  for (const a of applications) {
    if (a.status !== status) continue
    const t = new Date(a[useField]).getTime()
    if (t > now - ms) recent += 1
    else if (t > now - 2 * ms && t <= now - ms) previous += 1
  }
  return { recent, previous }
}

/** Interviews with scheduled_at in [now - (offset+1)*week, now - offset*week). */
export function scheduledInterviewsInWeekRows(rows: InterviewAssignmentRow[], weekOffsetFromEnd: number) {
  const now = Date.now()
  const weekMs = 7 * 24 * 60 * 60 * 1000
  const end = now - weekOffsetFromEnd * weekMs
  const start = end - weekMs
  return rows.filter(r => {
    if (!r.scheduled_at) return false
    const t = new Date(r.scheduled_at).getTime()
    return t >= start && t < end
  }).length
}
