import type { Application } from '../../api/applications'
import type { InterviewAssignmentRow } from '../../api/interviews'
import type { Job } from '../../api/jobs'
import { DASHBOARD_CHART_COLORS, FUNNEL_STATUS_ORDER } from './dashboardConstants'

export type DashboardSlice = {
  key: string
  label: string
  value: number
  color: string
}

export type TrendDirection = 'up' | 'down' | 'flat'

export type TrendIndicator = {
  direction: TrendDirection
  /** e.g. "+12%" or "0%" */
  label: string
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
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}d ago`
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

export function workspaceFunnelCounts(applications: Application[]) {
  return FUNNEL_STATUS_ORDER.map(key => ({
    key,
    label: formatDashboardLabel(key),
    value: applications.filter(a => a.status === key).length,
  }))
}

export function pctChange(current: number, previous: number): TrendIndicator {
  if (previous === 0 && current === 0) return { direction: 'flat', label: '0%' }
  if (previous === 0) return { direction: 'up', label: '+100%' }
  const raw = Math.round(((current - previous) / previous) * 100)
  const direction: TrendDirection = raw > 0 ? 'up' : raw < 0 ? 'down' : 'flat'
  const sign = raw > 0 ? '+' : ''
  return { direction, label: `${sign}${raw}%` }
}

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
}

/** Count items whose ISO timestamp falls in [startMs, endMs). */
export function countInRange(isoDates: string[], startMs: number, endMs: number) {
  return isoDates.filter(iso => {
    const t = new Date(iso).getTime()
    return t >= startMs && t < endMs
  }).length
}

/** Last 30 days vs previous 30 days (rolling), by calendar day boundaries. */
export function rolling30DayPairCounts(now: Date, isoDates: string[]) {
  const today = startOfDay(now)
  const endCurrent = today + 86400000
  const startCurrent = endCurrent - 30 * 86400000
  const startPrevious = startCurrent - 30 * 86400000
  return {
    current: countInRange(isoDates, startCurrent, endCurrent),
    previous: countInRange(isoDates, startPrevious, startCurrent),
  }
}

export function trendFromPair(current: number, previous: number): TrendIndicator {
  return pctChange(current, previous)
}

export function dominantApplicantStage(jobId: number, applications: Application[]): string {
  const apps = applications.filter(a => a.job_id === jobId)
  if (apps.length === 0) return '—'
  const counts = FUNNEL_STATUS_ORDER.map(s => ({
    s,
    c: apps.filter(a => a.status === s).length,
  }))
  const best = counts.reduce((a, b) => (b.c > a.c ? b : a))
  if (best.c === 0) {
    const top = apps.reduce<Record<string, number>>((acc, a) => {
      acc[a.status] = (acc[a.status] ?? 0) + 1
      return acc
    }, {})
    const [status, n] = Object.entries(top).sort((x, y) => y[1] - x[1])[0] ?? ['', 0]
    if (!status || n === 0) return '—'
    return formatDashboardLabel(status)
  }
  return formatDashboardLabel(best.s)
}

export type ActivityItem = {
  id: string
  kind: 'application' | 'interview' | 'hired' | 'offer'
  title: string
  subtitle: string
  at: string
  ts: number
  applicationId?: number
}

export function buildActivityFeed(
  applications: Application[],
  interviews: InterviewAssignmentRow[],
  jobsById: Map<number, Job>,
  limit: number,
): ActivityItem[] {
  const items: ActivityItem[] = []

  for (const a of applications) {
    const job = jobsById.get(a.job_id)
    const jobTitle = job?.title ?? `Job #${a.job_id}`
    const name = a.candidate_name || a.candidate_email
    items.push({
      id: `app-${a.id}`,
      kind: 'application',
      title: 'Candidate applied',
      subtitle: `${name} · ${jobTitle}`,
      at: a.created_at,
      ts: new Date(a.created_at).getTime(),
      applicationId: a.id,
    })
    if (a.status === 'hired') {
      items.push({
        id: `hire-${a.id}`,
        kind: 'hired',
        title: 'Candidate hired',
        subtitle: `${name} · ${jobTitle}`,
        at: a.updated_at,
        ts: new Date(a.updated_at).getTime(),
        applicationId: a.id,
      })
    } else if (a.status === 'offer') {
      items.push({
        id: `offer-${a.id}`,
        kind: 'offer',
        title: 'Offer released',
        subtitle: `${name} · ${jobTitle}`,
        at: a.updated_at,
        ts: new Date(a.updated_at).getTime(),
        applicationId: a.id,
      })
    }
  }

  for (const row of interviews) {
    if (!row.scheduled_at) continue
    const jobTitle =
      row.job?.title ??
      (row.application?.job_id != null ? jobsById.get(row.application.job_id)?.title : undefined) ??
      'Interview'
    const cand = row.application?.candidate_name || row.application?.candidate_email || 'Candidate'
    items.push({
      id: `int-${row.id}`,
      kind: 'interview',
      title: 'Interview scheduled',
      subtitle: `${cand} · ${jobTitle}`,
      at: row.scheduled_at,
      ts: new Date(row.scheduled_at).getTime(),
      applicationId: row.application_id,
    })
  }

  return items.sort((a, b) => b.ts - a.ts).slice(0, limit)
}
