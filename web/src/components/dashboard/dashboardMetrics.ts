import type { Application } from '../../api/applications'
import type { InterviewAssignmentRow } from '../../api/interviews'
import type { Job } from '../../api/jobs'

export type TrendDirection = 'up' | 'down' | 'flat'

export type PeriodTrend = {
  pct: number
  direction: TrendDirection
  current: number
  previous: number
}

export function trendFromPeriods(current: number, previous: number): PeriodTrend {
  if (current === 0 && previous === 0) {
    return { pct: 0, direction: 'flat', current: 0, previous: 0 }
  }
  if (previous === 0) {
    return { pct: 100, direction: current > 0 ? 'up' : 'flat', current, previous: 0 }
  }
  const raw = Math.round(((current - previous) / previous) * 100)
  const direction: TrendDirection = raw > 0 ? 'up' : raw < 0 ? 'down' : 'flat'
  return { pct: Math.abs(raw), direction, current, previous }
}

export function daysAgoIso(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d.toISOString()
}

export function countApplicationsCreatedBetween(
  applications: Application[],
  startIso: string,
  endIso: string,
): number {
  const start = new Date(startIso).getTime()
  const end = new Date(endIso).getTime()
  return applications.filter(a => {
    const t = new Date(a.created_at).getTime()
    return t >= start && t < end
  }).length
}

export function countJobsCreatedBetween(jobs: Job[], startIso: string, endIso: string): number {
  const start = new Date(startIso).getTime()
  const end = new Date(endIso).getTime()
  return jobs.filter(j => {
    const t = new Date(j.created_at).getTime()
    return t >= start && t < end
  }).length
}

export function countInterviewsScheduledBetween(
  rows: InterviewAssignmentRow[],
  startIso: string,
  endIso: string,
): number {
  const start = new Date(startIso).getTime()
  const end = new Date(endIso).getTime()
  return rows.filter(row => {
    if (!row.scheduled_at) return false
    const t = new Date(row.scheduled_at).getTime()
    return t >= start && t < end
  }).length
}

export function countOfferEntriesFromHistory(
  applications: Application[],
  startIso: string,
  endIso: string,
): number {
  const start = new Date(startIso).getTime()
  const end = new Date(endIso).getTime()
  let n = 0
  for (const app of applications) {
    for (const h of app.stage_history ?? []) {
      if (h.stage !== 'offer') continue
      const t = new Date(h.changed_at).getTime()
      if (t >= start && t < end) n += 1
    }
  }
  return n
}

const PIPELINE_ORDER = ['applied', 'screening', 'interview', 'offer', 'hired'] as const

export type FunnelStep = (typeof PIPELINE_ORDER)[number]

/** Cumulative funnel: each step counts applicants currently at that stage or later (excluding rejected/withdrawn). */
export function buildPipelineFunnelCounts(applications: Application[]): Record<FunnelStep, number> {
  const active = applications.filter(a => a.status !== 'rejected' && a.status !== 'withdrawn')
  const atOrAfter = (step: FunnelStep) => {
    const idx = PIPELINE_ORDER.indexOf(step)
    const allowed = new Set(PIPELINE_ORDER.slice(idx))
    return active.filter(a => allowed.has(a.status as FunnelStep)).length
  }
  return {
    applied: atOrAfter('applied'),
    screening: atOrAfter('screening'),
    interview: atOrAfter('interview'),
    offer: atOrAfter('offer'),
    hired: atOrAfter('hired'),
  }
}

export type ActivityKind = 'application' | 'stage' | 'interview'

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
  const recentApps = [...applications]
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    .slice(0, 120)

  for (const app of recentApps) {
    const jobTitle = jobsById.get(app.job_id)?.title ?? `Job #${app.job_id}`
    const name = app.candidate_name || app.candidate_email
    const history = [...(app.stage_history ?? [])].sort(
      (a, b) => new Date(a.changed_at).getTime() - new Date(b.changed_at).getTime(),
    )
    items.push({
      id: `app-${app.id}-recv`,
      kind: 'application',
      title: 'Application received',
      subtitle: `${name} · ${jobTitle}`,
      at: app.created_at,
    })
    history.forEach((h, idx) => {
      if (h.stage === 'applied' && idx === 0) return
      const stageLabel = h.stage.replace(/_/g, ' ')
      items.push({
        id: `app-${app.id}-st-${idx}-${h.changed_at}`,
        kind: 'stage',
        title: `Pipeline: ${stageLabel}`,
        subtitle: `${name} · ${jobTitle}`,
        at: h.changed_at,
      })
    })
  }

  const recentInterviews = [...interviews]
    .sort((a, b) => {
      const ta = new Date(a.scheduled_at || 0).getTime()
      const tb = new Date(b.scheduled_at || 0).getTime()
      return tb - ta
    })
    .slice(0, 40)

  for (const row of recentInterviews) {
    const jobTitle = row.job?.title ?? (row.application?.job_id ? jobsById.get(row.application.job_id)?.title : undefined) ?? 'Interview'
    const cand = row.application?.candidate_name || row.application?.candidate_email || 'Candidate'
    const at = row.scheduled_at || row.updated_at || row.created_at
    if (!at) continue
    items.push({
      id: `int-${row.id}`,
      kind: 'interview',
      title: 'Interview touchpoint',
      subtitle: `${cand} · ${jobTitle}`,
      at,
    })
  }

  items.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
  return items.slice(0, limit)
}

export function dominantApplicantStageForJob(jobId: number, applications: Application[]): string | null {
  const counts: Record<string, number> = {}
  for (const a of applications) {
    if (a.job_id !== jobId) continue
    counts[a.status] = (counts[a.status] ?? 0) + 1
  }
  const entries = Object.entries(counts)
  if (entries.length === 0) return null
  entries.sort((x, y) => y[1] - x[1])
  return entries[0][0]
}
