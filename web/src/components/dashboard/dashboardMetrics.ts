import type { Application } from '../../api/applications'
import type { InterviewAssignmentRow } from '../../api/interviews'
import type { Job } from '../../api/jobs'

export type TrendDirection = 'up' | 'down' | 'flat'

export type MonthPair = { current: number; previous: number }

const PIPELINE_ORDER = ['applied', 'screening', 'interview', 'offer', 'hired'] as const

export type PipelineStage = (typeof PIPELINE_ORDER)[number]

export function monthBounds() {
  const now = new Date()
  const curY = now.getFullYear()
  const curM = now.getMonth()
  const prev = new Date(curY, curM - 1, 1)
  return {
    current: { y: curY, m: curM },
    previous: { y: prev.getFullYear(), m: prev.getMonth() },
  }
}

export function isInCalendarMonth(iso: string | null, y: number, m: number) {
  if (!iso) return false
  const d = new Date(iso)
  return d.getFullYear() === y && d.getMonth() === m
}

export function trendFromPair(pair: MonthPair): { direction: TrendDirection; pct: number } {
  const { current, previous } = pair
  if (previous === 0 && current === 0) return { direction: 'flat', pct: 0 }
  if (previous === 0) return { direction: 'up', pct: 100 }
  const raw = ((current - previous) / previous) * 100
  const pct = Math.round(Math.abs(raw))
  if (raw > 0.5) return { direction: 'up', pct }
  if (raw < -0.5) return { direction: 'down', pct }
  return { direction: 'flat', pct: 0 }
}

export function applicationsCreatedInMonth(apps: Application[], y: number, m: number) {
  return apps.filter(a => isInCalendarMonth(a.created_at, y, m)).length
}

export function applicationsUpdatedInMonthWithStatus(apps: Application[], status: string, y: number, m: number) {
  return apps.filter(a => a.status === status && isInCalendarMonth(a.updated_at, y, m)).length
}

export function openJobsCreatedInMonth(jobs: Job[], y: number, m: number) {
  return jobs.filter(j => j.status === 'open' && isInCalendarMonth(j.created_at, y, m)).length
}

/** Open roles with activity this month (updated_at), as a simple velocity proxy for trends. */
export function openJobsActiveInMonth(jobs: Job[], y: number, m: number) {
  return jobs.filter(j => j.status === 'open' && isInCalendarMonth(j.updated_at, y, m)).length
}

export function interviewsScheduledInMonth(rows: InterviewAssignmentRow[], y: number, m: number) {
  return rows.filter(r => r.scheduled_at && isInCalendarMonth(r.scheduled_at, y, m)).length
}

export function workspacePipelineCounts(apps: Application[]): Record<PipelineStage, number> {
  const init: Record<PipelineStage, number> = {
    applied: 0,
    screening: 0,
    interview: 0,
    offer: 0,
    hired: 0,
  }
  for (const a of apps) {
    const s = a.status as string
    if (s in init) init[s as PipelineStage] += 1
  }
  return init
}

export function funnelChartValues(apps: Application[]) {
  const c = workspacePipelineCounts(apps)
  return PIPELINE_ORDER.map(stage => ({ stage, label: formatStageLabel(stage), value: c[stage] }))
}

function formatStageLabel(stage: string) {
  return stage.charAt(0).toUpperCase() + stage.slice(1)
}

export type ActivityKind = 'applied' | 'interview' | 'offer' | 'hired' | 'stage'

export type ActivityItem = {
  id: string
  kind: ActivityKind
  title: string
  subtitle: string
  at: string
  sortKey: number
}

export function buildActivityFeed(
  apps: Application[],
  interviews: InterviewAssignmentRow[],
  jobsById: Map<number, Job>,
  limit = 14,
): ActivityItem[] {
  const items: ActivityItem[] = []

  for (const a of apps) {
    const jobTitle = jobsById.get(a.job_id)?.title ?? `Job #${a.job_id}`
    const name = a.candidate_name || a.candidate_email
    items.push({
      id: `app-created-${a.id}`,
      kind: 'applied',
      title: `${name} applied`,
      subtitle: jobTitle,
      at: a.created_at,
      sortKey: new Date(a.created_at).getTime(),
    })
    if (a.status === 'hired') {
      items.push({
        id: `app-hired-${a.id}`,
        kind: 'hired',
        title: `${name} marked hired`,
        subtitle: jobTitle,
        at: a.updated_at,
        sortKey: new Date(a.updated_at).getTime(),
      })
    } else if (a.status === 'offer') {
      items.push({
        id: `app-offer-${a.id}`,
        kind: 'offer',
        title: `Offer stage · ${name}`,
        subtitle: jobTitle,
        at: a.updated_at,
        sortKey: new Date(a.updated_at).getTime(),
      })
    }
  }

  for (const row of interviews) {
    if (!row.scheduled_at) continue
    const jobTitle = row.job?.title ?? (row.application?.job_id ? jobsById.get(row.application.job_id)?.title : null) ?? 'Interview'
    const name = row.application?.candidate_name || row.application?.candidate_email || 'Candidate'
    items.push({
      id: `int-${row.id}`,
      kind: 'interview',
      title: `Interview scheduled · ${name}`,
      subtitle: jobTitle,
      at: row.scheduled_at,
      sortKey: new Date(row.scheduled_at).getTime(),
    })
  }

  items.sort((x, y) => y.sortKey - x.sortKey)
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

export function applicantsPerJob(apps: Application[], jobs: Job[]) {
  const counts = new Map<number, number>()
  for (const a of apps) {
    counts.set(a.job_id, (counts.get(a.job_id) ?? 0) + 1)
  }
  return jobs
    .map(job => ({
      job,
      count: counts.get(job.id) ?? 0,
      byStatus: {} as Record<string, number>,
    }))
    .map(row => {
      const byStatus: Record<string, number> = {}
      for (const a of apps) {
        if (a.job_id !== row.job.id) continue
        byStatus[a.status] = (byStatus[a.status] ?? 0) + 1
      }
      const dominant = Object.entries(byStatus).sort((a, b) => b[1] - a[1])[0]
      return { ...row, byStatus, dominantStage: dominant?.[0] ?? null, dominantCount: dominant?.[1] ?? 0 }
    })
    .sort((a, b) => b.count - a.count)
}

export function sourceSlicesFromApplications(apps: Application[], colors: string[]) {
  const acc: Record<string, number> = {}
  for (const a of apps) {
    const key = a.source_type || 'unknown'
    acc[key] = (acc[key] ?? 0) + 1
  }
  return Object.entries(acc)
    .filter(([, v]) => v > 0)
    .map(([label, value], i) => ({
      key: label,
      label: label.replace(/_/g, ' ').replace(/\b\w/g, ch => ch.toUpperCase()),
      value,
      color: colors[i % colors.length],
    }))
}
