import type { Application } from '../../api/applications'
import type { InterviewAssignmentRow } from '../../api/interviews'
import type { Job } from '../../api/jobs'

export const DASHBOARD_CHART_COLORS = [
  '#00b4d8',
  '#3b82f6',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#6b7280',
  '#8b5cf6',
]

export const BRAND_LINE = '#2563eb'
export const BRAND_FILL = 'rgba(37, 99, 235, 0.14)'

export function formatDashboardLabel(value: string) {
  return value.replace(/_/g, ' ').replace(/\b\w/g, ch => ch.toUpperCase())
}

export type DashboardSlice = {
  key: string
  label: string
  value: number
  color: string
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

export function monthKeyFromDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export function countApplicationsInMonth(apps: Application[], year: number, monthIndex0: number) {
  return apps.filter(a => {
    const t = new Date(a.created_at)
    return t.getFullYear() === year && t.getMonth() === monthIndex0
  }).length
}

export function countInterviewsScheduledInMonth(rows: InterviewAssignmentRow[], year: number, monthIndex0: number) {
  return rows.filter(row => {
    if (!row.scheduled_at) return false
    const t = new Date(row.scheduled_at)
    if (t.getFullYear() !== year || t.getMonth() !== monthIndex0) return false
    return row.status === 'scheduled' || row.status === 'pending' || row.status === 'completed'
  }).length
}

/** Offers extended in a month: stage_history transition to offer, else offer status + updated_at in month */
export function countOffersReleasedInMonth(apps: Application[], year: number, monthIndex0: number) {
  const inMonth = (iso: string) => {
    const t = new Date(iso)
    return t.getFullYear() === year && t.getMonth() === monthIndex0
  }
  let n = 0
  for (const app of apps) {
    const hist = app.stage_history ?? []
    const fromHistory = hist.some(
      e => e.stage === 'offer' && e.changed_at && inMonth(e.changed_at),
    )
    if (fromHistory) {
      n += 1
      continue
    }
    if (app.status === 'offer' && inMonth(app.updated_at)) n += 1
  }
  return n
}

export function uniqueCandidateCount(apps: Application[]) {
  const set = new Set(apps.map(a => a.candidate_email.trim().toLowerCase()))
  return set.size
}

export type TrendDirection = 'up' | 'down' | 'flat'

export function monthOverMonthTrend(current: number, previous: number): {
  direction: TrendDirection
  pct: number | null
  label: string
} {
  if (previous === 0 && current === 0) {
    return { direction: 'flat', pct: null, label: '—' }
  }
  if (previous === 0) {
    return { direction: 'up', pct: null, label: 'New' }
  }
  const raw = ((current - previous) / previous) * 100
  const pct = Math.round(raw)
  const direction: TrendDirection = pct > 0 ? 'up' : pct < 0 ? 'down' : 'flat'
  const sign = pct > 0 ? '+' : ''
  return { direction, pct, label: `${sign}${pct}%` }
}

const PIPELINE_ORDER = ['applied', 'screening', 'interview', 'offer', 'hired'] as const

export type PipelineFunnelKey = (typeof PIPELINE_ORDER)[number]

export function funnelCountsFromApplications(apps: Application[]) {
  const byStatus = apps.reduce<Record<string, number>>((acc, a) => {
    acc[a.status] = (acc[a.status] ?? 0) + 1
    return acc
  }, {})

  return {
    labels: ['Applied', 'Screening', 'Interview', 'Offer', 'Hired'] as const,
    keys: [...PIPELINE_ORDER],
    values: [
      byStatus.applied ?? 0,
      byStatus.screening ?? 0,
      byStatus.interview ?? 0,
      byStatus.offer ?? 0,
      byStatus.hired ?? 0,
    ] as number[],
  }
}

export function applicationsPerJob(apps: Application[], jobs: Job[]) {
  const counts = apps.reduce<Record<number, number>>((acc, a) => {
    acc[a.job_id] = (acc[a.job_id] ?? 0) + 1
    return acc
  }, {})
  return jobs.map(j => ({ job: j, count: counts[j.id] ?? 0 })).sort((a, b) => b.count - a.count)
}

export type ActivityKind = 'application' | 'interview' | 'offer' | 'hire' | 'stage'

export type ActivityItem = {
  id: string
  kind: ActivityKind
  title: string
  subtitle: string
  at: string
}

export function buildActivityFeed(
  apps: Application[],
  interviews: InterviewAssignmentRow[],
  limit: number,
): ActivityItem[] {
  const items: ActivityItem[] = []

  const recentApps = [...apps].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 20)
  for (const app of recentApps) {
    items.push({
      id: `app-${app.id}`,
      kind: 'application',
      title: `Candidate applied`,
      subtitle: `${app.candidate_name || app.candidate_email} · ${formatDashboardLabel(app.status)}`,
      at: app.created_at,
    })
  }

  const stageEvents: ActivityItem[] = []
  for (const app of apps) {
    for (const h of app.stage_history ?? []) {
      if (!h.changed_at) continue
      const stage = h.stage
      let kind: ActivityKind = 'stage'
      let title = `Pipeline update`
      if (stage === 'offer') {
        kind = 'offer'
        title = `Moved to offer`
      } else if (stage === 'hired') {
        kind = 'hire'
        title = `Candidate hired`
      } else if (stage === 'interview') {
        kind = 'interview'
        title = `Interview stage`
      } else if (stage === 'screening') {
        title = `Screening stage`
      }
      stageEvents.push({
        id: `st-${app.id}-${h.changed_at}-${stage}`,
        kind,
        title,
        subtitle: `${app.candidate_name || app.candidate_email}`,
        at: h.changed_at,
      })
    }
  }
  stageEvents.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
  items.push(...stageEvents.slice(0, 15))

  for (const row of interviews) {
    if (!row.scheduled_at) continue
    items.push({
      id: `int-${row.id}`,
      kind: 'interview',
      title: `Interview scheduled`,
      subtitle: `${row.application?.candidate_name || row.application?.candidate_email || 'Candidate'}${row.job?.title ? ` · ${row.job.title}` : ''}`,
      at: row.scheduled_at,
    })
  }

  items.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
  const seen = new Set<string>()
  const deduped: ActivityItem[] = []
  for (const it of items) {
    if (seen.has(it.id)) continue
    seen.add(it.id)
    deduped.push(it)
    if (deduped.length >= limit) break
  }
  return deduped
}
