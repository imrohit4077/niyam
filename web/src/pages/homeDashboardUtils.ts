import type { Application } from '../api/applications'
import type { InterviewAssignmentRow } from '../api/interviews'
import type { Job } from '../api/jobs'

/** Canonical funnel stages for workspace rollup */
export const FUNNEL_STATUS_ORDER = ['applied', 'screening', 'interview', 'offer', 'hired'] as const

export type FunnelStage = (typeof FUNNEL_STATUS_ORDER)[number]

export function countByApplicationStatus(applications: Application[]): Record<string, number> {
  return applications.reduce<Record<string, number>>((acc, a) => {
    acc[a.status] = (acc[a.status] ?? 0) + 1
    return acc
  }, {})
}

export function funnelCountsFromApplications(applications: Application[]): number[] {
  const byStatus = countByApplicationStatus(applications)
  return FUNNEL_STATUS_ORDER.map(stage => byStatus[stage] ?? 0)
}

export function applicantsPerJob(
  applications: Application[],
  jobs: Job[],
): Array<{ jobId: number; title: string; count: number }> {
  const byJob = applications.reduce<Record<number, number>>((acc, a) => {
    acc[a.job_id] = (acc[a.job_id] ?? 0) + 1
    return acc
  }, {})
  const titleById = new Map(jobs.map(j => [j.id, j.title]))
  return Object.entries(byJob)
    .map(([jobId, count]) => ({
      jobId: Number(jobId),
      title: titleById.get(Number(jobId)) ?? `Job #${jobId}`,
      count,
    }))
    .sort((a, b) => b.count - a.count)
}

export function dominantApplicantStage(jobId: number, applications: Application[]): string | null {
  const forJob = applications.filter(a => a.job_id === jobId)
  if (forJob.length === 0) return null
  const byStatus = countByApplicationStatus(forJob)
  const sorted = Object.entries(byStatus).sort(([a], [b]) => a.localeCompare(b))
  let best: string | null = null
  let bestN = -1
  for (const [status, n] of sorted) {
    if (n > bestN) {
      bestN = n
      best = status
    }
  }
  return best
}

export type TrendResult = { pct: number | null; label: string }

export function percentChangeVsPriorPeriod(current: number, previous: number, periodLabel: string): TrendResult {
  if (previous === 0 && current === 0) return { pct: null, label: `No data for ${periodLabel}` }
  if (previous === 0) return { pct: null, label: `No prior ${periodLabel} to compare` }
  return {
    pct: Math.round(((current - previous) / previous) * 100),
    label: `vs prior ${periodLabel}`,
  }
}

function inRange(iso: string, start: Date, end: Date) {
  const t = new Date(iso).getTime()
  return t >= start.getTime() && t < end.getTime()
}

/** Applications created in [start, end) */
export function countApplicationsCreatedInRange(applications: Application[], start: Date, end: Date) {
  return applications.filter(a => inRange(a.created_at, start, end)).length
}

export function openJobsCreatedInRange(jobs: Job[], start: Date, end: Date) {
  return jobs.filter(j => j.status === 'open' && inRange(j.created_at, start, end)).length
}

export function offersTouchedInRange(applications: Application[], start: Date, end: Date) {
  return applications.filter(a => a.status === 'offer' && inRange(a.updated_at, start, end)).length
}

export function interviewsScheduledStartingInRange(rows: InterviewAssignmentRow[], start: Date, end: Date) {
  return rows.filter(r => {
    if (!r.scheduled_at) return false
    const t = new Date(r.scheduled_at)
    return t.getTime() >= start.getTime() && t.getTime() < end.getTime()
  }).length
}

export type ActivityKind = 'application' | 'stage' | 'interview'

export type ActivityFeedItem = {
  id: string
  kind: ActivityKind
  title: string
  subtitle: string
  at: string
}

function formatStageLabel(stage: string) {
  return stage.replace(/_/g, ' ').replace(/\b\w/g, ch => ch.toUpperCase())
}

export function buildActivityFeed(
  applications: Application[],
  interviews: InterviewAssignmentRow[],
  maxItems: number,
): ActivityFeedItem[] {
  const items: ActivityFeedItem[] = []

  for (const app of applications) {
    items.push({
      id: `app-${app.id}-created`,
      kind: 'application',
      title: 'New application',
      subtitle: `${app.candidate_name || app.candidate_email} · ${formatStageLabel(app.status)}`,
      at: app.created_at,
    })
    const history = app.stage_history ?? []
    for (let i = 0; i < history.length; i++) {
      const h = history[i]
      items.push({
        id: `app-${app.id}-stage-${i}-${h.changed_at}`,
        kind: 'stage',
        title: 'Pipeline update',
        subtitle: `${app.candidate_name || app.candidate_email} → ${formatStageLabel(h.stage)}`,
        at: h.changed_at,
      })
    }
  }

  for (const row of interviews) {
    const name = row.application?.candidate_name || row.application?.candidate_email || 'Candidate'
    const jobTitle = row.job?.title ?? 'Role'
    if (row.scheduled_at) {
      items.push({
        id: `int-${row.id}-sched`,
        kind: 'interview',
        title: 'Interview scheduled',
        subtitle: `${name} · ${jobTitle}`,
        at: row.scheduled_at,
      })
    }
  }

  items.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
  return items.slice(0, maxItems)
}
