import type { Application } from '../../api/applications'
import type { InterviewAssignmentRow } from '../../api/interviews'
import type { Job } from '../../api/jobs'

export const PIPELINE_FUNNEL_STAGES = [
  { key: 'applied', label: 'Applied' },
  { key: 'screening', label: 'Screening' },
  { key: 'interview', label: 'Interview' },
  { key: 'offer', label: 'Offer' },
  { key: 'hired', label: 'Hired' },
] as const

export type PipelineStageKey = (typeof PIPELINE_FUNNEL_STAGES)[number]['key']

export function startEndOfLast30Days() {
  const end = new Date()
  const start = new Date(end)
  start.setDate(start.getDate() - 30)
  const prevEnd = new Date(start)
  const prevStart = new Date(prevEnd)
  prevStart.setDate(prevStart.getDate() - 30)
  return { start, end, prevStart, prevEnd }
}

export function isInRange(iso: string, rangeStart: Date, rangeEnd: Date) {
  const t = new Date(iso).getTime()
  return t >= rangeStart.getTime() && t < rangeEnd.getTime()
}

/** Percent change from prior to current; caps display magnitude for UI stability. */
export function trendPercent(current: number, previous: number): { pct: number; up: boolean; flat: boolean } {
  if (current === previous) return { pct: 0, up: true, flat: true }
  if (previous === 0) return { pct: current > 0 ? 100 : 0, up: current > 0, flat: current === 0 }
  const raw = Math.round(((current - previous) / previous) * 100)
  const capped = Math.max(-999, Math.min(999, raw))
  return { pct: capped, up: current >= previous, flat: false }
}

export function formatTrendLabel(t: ReturnType<typeof trendPercent>): string {
  if (t.flat && t.pct === 0) return '0%'
  const arrow = t.up ? '↑' : '↓'
  return `${arrow} ${Math.abs(t.pct)}%`
}

export function countApplicationsCreatedInRange(apps: Application[], start: Date, end: Date) {
  return apps.filter(a => isInRange(a.created_at, start, end)).length
}

export function countJobsCreatedInRange(jobs: Job[], start: Date, end: Date) {
  return jobs.filter(j => isInRange(j.created_at, start, end)).length
}

export function countInterviewsActivityInRange(rows: InterviewAssignmentRow[], start: Date, end: Date) {
  return rows.filter(r => {
    const anchor = r.scheduled_at || r.created_at
    return anchor && isInRange(anchor, start, end)
  }).length
}

export function countOffersTouchedInRange(apps: Application[], start: Date, end: Date) {
  return apps.filter(a => a.status === 'offer' && isInRange(a.updated_at, start, end)).length
}

export function buildFunnelCounts(apps: Application[]) {
  const byStatus = apps.reduce<Record<string, number>>((acc, a) => {
    acc[a.status] = (acc[a.status] ?? 0) + 1
    return acc
  }, {})
  return PIPELINE_FUNNEL_STAGES.map(({ key, label }) => ({
    key,
    label,
    value: byStatus[key] ?? 0,
  }))
}

export type ActivityFeedItem = {
  id: string
  at: string
  headline: string
  detail: string
}

export function buildActivityFeed(
  apps: Application[],
  interviews: InterviewAssignmentRow[],
  jobsById: Map<number, Job>,
  limit = 14,
): ActivityFeedItem[] {
  const items: ActivityFeedItem[] = []

  for (const app of apps) {
    const job = jobsById.get(app.job_id)
    const jobTitle = job?.title ?? `Job #${app.job_id}`
    const name = app.candidate_name?.trim() || app.candidate_email
    const hist = app.stage_history ?? []
    const last = hist.length ? hist[hist.length - 1] : null
    const createdAt = app.created_at
    const useStage = last && (!createdAt || new Date(last.changed_at) >= new Date(createdAt))
    if (useStage && last) {
      items.push({
        id: `app-${app.id}-stage-${last.changed_at}`,
        at: last.changed_at,
        headline: `Stage updated — ${name}`,
        detail: `${jobTitle} · ${formatStageLabel(last.stage)}`,
      })
    } else {
      items.push({
        id: `app-${app.id}-created`,
        at: createdAt,
        headline: `New application — ${name}`,
        detail: jobTitle,
      })
    }
  }

  for (const row of interviews) {
    const name =
      row.application?.candidate_name?.trim() || row.application?.candidate_email || 'Candidate'
    const jobTitle = row.job?.title ?? `Job #${row.application?.job_id ?? '—'}`
    items.push({
      id: `int-${row.id}-${row.updated_at}`,
      at: row.scheduled_at || row.updated_at,
      headline: `Interview ${row.scheduled_at ? 'scheduled' : 'updated'} — ${name}`,
      detail: `${jobTitle} · ${formatStageLabel(row.status)}`,
    })
  }

  items.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
  return items.slice(0, limit)
}

function formatStageLabel(value: string) {
  return value.replace(/_/g, ' ').replace(/\b\w/g, ch => ch.toUpperCase())
}

export function dominantApplicantStage(apps: Application[]): string {
  if (apps.length === 0) return '—'
  const counts = apps.reduce<Record<string, number>>((acc, a) => {
    acc[a.status] = (acc[a.status] ?? 0) + 1
    return acc
  }, {})
  let best = ''
  let bestN = -1
  for (const [k, n] of Object.entries(counts)) {
    if (n > bestN) {
      best = k
      bestN = n
    }
  }
  return formatStageLabel(best)
}

export function applicantCountByJobId(apps: Application[]) {
  return apps.reduce<Record<number, number>>((acc, a) => {
    acc[a.job_id] = (acc[a.job_id] ?? 0) + 1
    return acc
  }, {})
}
