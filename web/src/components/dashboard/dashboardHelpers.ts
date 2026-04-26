import type { Application } from '../../api/applications'
import type { InterviewAssignmentRow } from '../../api/interviews'
import type { Job } from '../../api/jobs'
import { DASHBOARD_CHART_COLORS } from './dashboardTheme'
import type { DashboardSlice, TrendResult } from './dashboardTypes'

export function formatDashboardLabel(value: string) {
  return value
    .replace(/_/g, ' ')
    .replace(/\b\w/g, ch => ch.toUpperCase())
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
  const d = new Date(iso)
  const diffMs = Date.now() - d.getTime()
  const mins = Math.floor(diffMs / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}d ago`
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

const MS_DAY = 86400000

export function windowBounds() {
  const now = Date.now()
  const endCurrent = now
  const startCurrent = now - 30 * MS_DAY
  const endPrior = startCurrent
  const startPrior = startCurrent - 30 * MS_DAY
  return { startCurrent, endCurrent, startPrior, endPrior }
}

export function inRange(iso: string, start: number, end: number) {
  const t = new Date(iso).getTime()
  return t >= start && t < end
}

export function totalUniqueCandidates(applications: Application[]) {
  return new Set(applications.map(a => a.candidate_email.trim().toLowerCase())).size
}

/** Distinct candidate emails with a new application in the time window. */
export function countDistinctNewCandidatesInRange(applications: Application[], start: number, end: number) {
  const set = new Set<string>()
  for (const a of applications) {
    if (inRange(a.created_at, start, end)) set.add(a.candidate_email.trim().toLowerCase())
  }
  return set.size
}

/** Percent change current vs prior slice; flat when both zero. */
export function trendFromCounts(current: number, prior: number): TrendResult {
  if (current === 0 && prior === 0) return { direction: 'flat', label: '—' }
  if (prior === 0 && current > 0) return { direction: 'up', label: 'New' }
  if (prior === 0) return { direction: 'flat', label: '—' }
  const raw = ((current - prior) / prior) * 100
  const rounded = Math.round(raw)
  const direction: TrendResult['direction'] = rounded > 0 ? 'up' : rounded < 0 ? 'down' : 'flat'
  const sign = rounded > 0 ? '+' : ''
  return { direction, label: `${sign}${rounded}%` }
}

export function countApplicationsInRange(applications: Application[], start: number, end: number) {
  return applications.filter(a => inRange(a.created_at, start, end)).length
}

export function countNewJobsInRange(jobs: Job[], start: number, end: number) {
  return jobs.filter(j => inRange(j.created_at, start, end)).length
}

export function countNewOpenJobsInRange(jobs: Job[], start: number, end: number) {
  return jobs.filter(j => j.status === 'open' && inRange(j.created_at, start, end)).length
}

export function countInterviewActivityInRange(rows: InterviewAssignmentRow[], start: number, end: number) {
  return rows.filter(r => inRange(r.updated_at, start, end) || inRange(r.created_at, start, end)).length
}

/** Approximate "offers touched" in range using updated_at on offer-stage applications. */
export function countOfferTouchesInRange(applications: Application[], start: number, end: number) {
  return applications.filter(a => a.status === 'offer' && inRange(a.updated_at, start, end)).length
}

const PIPELINE_ORDER = ['applied', 'screening', 'interview', 'offer', 'hired'] as const

export type PipelineStageKey = (typeof PIPELINE_ORDER)[number]

export function aggregatePipelineStages(applications: Application[]): Record<PipelineStageKey, number> {
  const acc: Record<PipelineStageKey, number> = {
    applied: 0,
    screening: 0,
    interview: 0,
    offer: 0,
    hired: 0,
  }
  for (const a of applications) {
    const s = a.status as string
    if (s in acc) acc[s as PipelineStageKey] += 1
  }
  return acc
}

const PIPELINE_FUNNEL_COLORS = ['#0ea5e9', '#38bdf8', '#6366f1', '#a855f7', '#10b981']

/** Chart.js horizontal bar data: one bar per pipeline stage (workspace-wide). */
export function pipelineFunnelBarData(counts: Record<PipelineStageKey, number>) {
  return {
    labels: PIPELINE_ORDER.map(k => formatDashboardLabel(k)),
    datasets: [
      {
        label: 'Candidates',
        data: PIPELINE_ORDER.map(k => counts[k]),
        backgroundColor: PIPELINE_FUNNEL_COLORS,
        borderRadius: 8,
        maxBarThickness: 32,
      },
    ],
  }
}

export type ActivityKind = 'application' | 'interview' | 'hire' | 'offer' | 'rejection'

export type ActivityItem = {
  id: string
  kind: ActivityKind
  title: string
  subtitle: string
  at: string
}

export function buildActivityFeed(
  applications: Application[],
  interviews: InterviewAssignmentRow[],
  max = 14,
): ActivityItem[] {
  const items: ActivityItem[] = []

  for (const a of applications) {
    const name = a.candidate_name || a.candidate_email
    if (a.status === 'hired') {
      items.push({
        id: `hire-${a.id}`,
        kind: 'hire',
        title: `${name} hired`,
        subtitle: 'Application',
        at: a.updated_at,
      })
    } else if (a.status === 'offer') {
      items.push({
        id: `offer-${a.id}`,
        kind: 'offer',
        title: `Offer · ${name}`,
        subtitle: 'Application',
        at: a.updated_at,
      })
    } else if (a.status === 'rejected' || a.status === 'withdrawn') {
      items.push({
        id: `rej-${a.id}`,
        kind: 'rejection',
        title: `${name} · ${formatDashboardLabel(a.status)}`,
        subtitle: 'Application',
        at: a.updated_at,
      })
    } else {
      items.push({
        id: `app-${a.id}`,
        kind: 'application',
        title: `New application · ${name}`,
        subtitle: formatDashboardLabel(a.status),
        at: a.created_at,
      })
    }
  }

  for (const row of interviews) {
    const cand =
      row.application?.candidate_name || row.application?.candidate_email || 'Candidate'
    const when = row.scheduled_at || row.updated_at
    items.push({
      id: `int-${row.id}`,
      kind: 'interview',
      title: `Interview · ${cand}`,
      subtitle: row.job?.title ? `${row.job.title} · ${formatDashboardLabel(row.status)}` : formatDashboardLabel(row.status),
      at: when,
    })
  }

  items.sort((x, y) => new Date(y.at).getTime() - new Date(x.at).getTime())
  return items.slice(0, max)
}
