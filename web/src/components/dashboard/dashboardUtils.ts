import type { Application } from '../../api/applications'
import type { InterviewAssignmentRow } from '../../api/interviews'
import type { Job } from '../../api/jobs'

/** Canonical funnel stages for workspace-level visualization */
export const PIPELINE_FUNNEL_STAGES = ['applied', 'screening', 'interview', 'offer', 'hired'] as const

export type PipelineFunnelStage = (typeof PIPELINE_FUNNEL_STAGES)[number]

export function formatDashboardLabel(value: string) {
  return value.replace(/_/g, ' ').replace(/\b\w/g, ch => ch.toUpperCase())
}

export function pctChangeVsPrevious(current: number, previous: number): { pct: number; direction: 'up' | 'down' | 'flat' } {
  if (current === previous) return { pct: 0, direction: 'flat' }
  if (previous === 0) return { pct: current > 0 ? 100 : 0, direction: current > 0 ? 'up' : 'flat' }
  const raw = ((current - previous) / previous) * 100
  const pct = Math.min(999, Math.round(Math.abs(raw)))
  return { pct, direction: raw > 0 ? 'up' : raw < 0 ? 'down' : 'flat' }
}

export function countApplicationsCreatedBetween(apps: Application[], start: Date, end: Date) {
  return apps.filter(a => {
    const t = new Date(a.created_at).getTime()
    return t >= start.getTime() && t < end.getTime()
  }).length
}

export function countInterviewsScheduledBetween(rows: InterviewAssignmentRow[], start: Date, end: Date) {
  return rows.filter(row => {
    if (!row.scheduled_at) return false
    const t = new Date(row.scheduled_at).getTime()
    return t >= start.getTime() && t < end.getTime()
  }).length
}

export function countOffersTouchedBetween(apps: Application[], start: Date, end: Date) {
  return apps.filter(a => {
    if (a.status !== 'offer') return false
    const t = new Date(a.updated_at).getTime()
    return t >= start.getTime() && t < end.getTime()
  }).length
}

export function countOpenJobsCreatedBetween(jobs: Job[], start: Date, end: Date) {
  return jobs.filter(j => {
    if (j.status !== 'open') return false
    const t = new Date(j.created_at).getTime()
    return t >= start.getTime() && t < end.getTime()
  }).length
}

/** Monotonic funnel counts: each stage includes all candidates at that stage or later (active statuses only). */
export function cumulativePipelineFunnelCounts(apps: Application[]) {
  const active = apps.filter(a => a.status !== 'rejected' && a.status !== 'withdrawn')
  const inSet = (statuses: Set<string>) => active.filter(a => statuses.has(a.status)).length
  return {
    applied: inSet(new Set(['applied', 'screening', 'interview', 'offer', 'hired'])),
    screening: inSet(new Set(['screening', 'interview', 'offer', 'hired'])),
    interview: inSet(new Set(['interview', 'offer', 'hired'])),
    offer: inSet(new Set(['offer', 'hired'])),
    hired: inSet(new Set(['hired'])),
  }
}

export function dominantApplicationStatus(apps: Application[]): string | null {
  if (apps.length === 0) return null
  const tally: Record<string, number> = {}
  for (const a of apps) {
    tally[a.status] = (tally[a.status] ?? 0) + 1
  }
  let best = ''
  let bestN = -1
  for (const [k, n] of Object.entries(tally)) {
    if (n > bestN) {
      best = k
      bestN = n
    }
  }
  return best
}

export type ActivityKind = 'application' | 'interview' | 'offer' | 'hire'

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
  jobs: Job[],
  limit = 14,
): ActivityItem[] {
  const jobTitle = (jobId: number) => jobs.find(j => j.id === jobId)?.title ?? `Job #${jobId}`

  const fromApps: ActivityItem[] = apps.map(a => {
    let kind: ActivityKind = 'application'
    if (a.status === 'hired') kind = 'hire'
    else if (a.status === 'offer') kind = 'offer'
    const title =
      kind === 'hire'
        ? 'Candidate hired'
        : kind === 'offer'
          ? 'Offer stage'
          : 'Candidate applied'
    const when = kind === 'application' ? a.created_at : a.updated_at
    return {
      id: `app-${a.id}-${kind}`,
      kind,
      title,
      subtitle: `${a.candidate_name || a.candidate_email} · ${jobTitle(a.job_id)}`,
      at: when,
    }
  })

  const fromInterviews: ActivityItem[] = interviews
    .filter(row => row.scheduled_at)
    .map(row => {
      const jid = row.job?.id ?? row.application?.job_id
      const jt = row.job?.title ?? (jid != null ? jobTitle(jid) : 'Role')
      return {
        id: `int-${row.id}`,
        kind: 'interview' as const,
        title: 'Interview scheduled',
        subtitle: `${row.application?.candidate_name || row.application?.candidate_email || 'Candidate'} · ${jt}`,
        at: row.scheduled_at!,
      }
    })

  return [...fromApps, ...fromInterviews]
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .slice(0, limit)
}
