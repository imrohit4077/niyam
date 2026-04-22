import type { Application } from '../../api/applications'
import type { InterviewAssignmentRow } from '../../api/interviews'
import type { Job } from '../../api/jobs'
import type { SummaryTrend } from './SummaryMetricCard'

export const DASHBOARD_CHART_COLORS = ['#00b4d8', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#6b7280', '#8b5cf6']

export type DashboardSlice = {
  key: string
  label: string
  value: number
  color: string
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

export function countApplicationsCreatedBetween(applications: Application[], start: Date, end: Date) {
  const a = start.getTime()
  const b = end.getTime()
  return applications.filter(app => {
    const t = new Date(app.created_at).getTime()
    return t >= a && t < b
  }).length
}

export function countByInterviewScheduleWindow(rows: InterviewAssignmentRow[], start: Date, end: Date) {
  const a = start.getTime()
  const b = end.getTime()
  return rows.filter(row => {
    const raw = row.scheduled_at || row.created_at
    if (!raw) return false
    const t = new Date(raw).getTime()
    return t >= a && t < b
  }).length
}

export function countOffersInWindow(applications: Application[], start: Date, end: Date) {
  const a = start.getTime()
  const b = end.getTime()
  return applications.filter(app => {
    if (app.status !== 'offer') return false
    const t = new Date(app.updated_at).getTime()
    return t >= a && t < b
  }).length
}

export function trendFromWindow(current: number, previous: number): SummaryTrend {
  if (previous === 0 && current === 0) return { arrow: '→', label: '0%', positive: undefined }
  if (previous === 0 && current > 0) return { arrow: '↑', label: 'New', positive: true }
  const pct = Math.round(((current - previous) / previous) * 100)
  if (pct > 0) return { arrow: '↑', label: `+${pct}%`, positive: true }
  if (pct < 0) return { arrow: '↓', label: `${pct}%`, positive: false }
  return { arrow: '→', label: '0%', positive: undefined }
}

export type ActivityKind = 'candidate' | 'interview' | 'offer' | 'hire' | 'stage'

export type ActivityFeedItem = {
  id: string
  kind: ActivityKind
  title: string
  subtitle: string
  at: string
}

export function buildActivityFeed(
  applications: Application[],
  interviews: InterviewAssignmentRow[],
  jobsById: Map<number, Job>,
  limit = 14,
): ActivityFeedItem[] {
  const items: ActivityFeedItem[] = []

  for (const app of applications) {
    const jobTitle = jobsById.get(app.job_id)?.title ?? `Job #${app.job_id}`
    const name = app.candidate_name || app.candidate_email
    items.push({
      id: `app-created-${app.id}`,
      kind: 'candidate',
      title: `Candidate added: ${name}`,
      subtitle: jobTitle,
      at: app.created_at,
    })
    const history = app.stage_history ?? []
    if (history.length > 0) {
      const latest = [...history].sort((a, b) => new Date(b.changed_at).getTime() - new Date(a.changed_at).getTime())[0]
      items.push({
        id: `stage-${app.id}-${latest.changed_at}`,
        kind: 'stage',
        title: `Latest move: ${formatDashboardLabel(latest.stage)}`,
        subtitle: `${name} · ${jobTitle}`,
        at: latest.changed_at,
      })
    }
    if (app.status === 'offer') {
      items.push({
        id: `offer-${app.id}-${app.updated_at}`,
        kind: 'offer',
        title: `Offer stage: ${name}`,
        subtitle: jobTitle,
        at: app.updated_at,
      })
    }
    if (app.status === 'hired') {
      items.push({
        id: `hire-${app.id}-${app.updated_at}`,
        kind: 'hire',
        title: `Hired: ${name}`,
        subtitle: jobTitle,
        at: app.updated_at,
      })
    }
  }

  for (const row of interviews) {
    const name = row.application?.candidate_name || row.application?.candidate_email || 'Candidate'
    const jobTitle = row.job?.title ?? (row.application?.job_id ? jobsById.get(row.application.job_id)?.title : null) ?? 'Role'
    if (row.scheduled_at) {
      items.push({
        id: `int-sched-${row.id}`,
        kind: 'interview',
        title: `Interview scheduled: ${name}`,
        subtitle: jobTitle,
        at: row.scheduled_at,
      })
    } else if (row.status === 'scheduled' || row.status === 'pending') {
      items.push({
        id: `int-pend-${row.id}-${row.updated_at}`,
        kind: 'interview',
        title: `Interview ${formatDashboardLabel(row.status)}: ${name}`,
        subtitle: jobTitle,
        at: row.updated_at,
      })
    }
  }

  items.sort((x, y) => new Date(y.at).getTime() - new Date(x.at).getTime())

  const seen = new Set<string>()
  const deduped: ActivityFeedItem[] = []
  for (const it of items) {
    if (seen.has(it.id)) continue
    seen.add(it.id)
    deduped.push(it)
    if (deduped.length >= limit) break
  }
  return deduped
}
