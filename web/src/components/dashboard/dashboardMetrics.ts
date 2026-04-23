import type { Application } from '../../api/applications'
import type { InterviewAssignmentRow } from '../../api/interviews'
import type { Job } from '../../api/jobs'

export type TrendDirection = 'up' | 'down' | 'flat'

/** Percent change vs prior period; caps display for stability. */
export function periodPercentChange(current: number, previous: number): { direction: TrendDirection; pct: number } {
  if (previous <= 0) {
    if (current <= 0) return { direction: 'flat', pct: 0 }
    return { direction: 'up', pct: 100 }
  }
  const raw = ((current - previous) / previous) * 100
  const rounded = Math.min(999, Math.round(Math.abs(raw)))
  if (Math.abs(raw) < 0.5) return { direction: 'flat', pct: 0 }
  return { direction: raw > 0 ? 'up' : 'down', pct: rounded }
}

function shiftMonth(base: Date, delta: number) {
  return new Date(base.getFullYear(), base.getMonth() + delta, 1)
}

export function countApplicationsInMonth(applications: Application[], offsetFromCurrent: number, now = new Date()) {
  const target = shiftMonth(now, offsetFromCurrent)
  const y = target.getFullYear()
  const m = target.getMonth()
  return applications.filter(a => {
    const d = new Date(a.created_at)
    return d.getFullYear() === y && d.getMonth() === m
  }).length
}

export function countJobsCreatedInMonth(jobs: Job[], offsetFromCurrent: number, now = new Date()) {
  const target = shiftMonth(now, offsetFromCurrent)
  const y = target.getFullYear()
  const m = target.getMonth()
  return jobs.filter(j => {
    const d = new Date(j.created_at)
    return d.getFullYear() === y && d.getMonth() === m
  }).length
}

export function countInterviewsScheduledInMonth(rows: InterviewAssignmentRow[], offsetFromCurrent: number, now = new Date()) {
  const target = shiftMonth(now, offsetFromCurrent)
  const y = target.getFullYear()
  const m = target.getMonth()
  return rows.filter(r => {
    if (!r.scheduled_at) return false
    const d = new Date(r.scheduled_at)
    return d.getFullYear() === y && d.getMonth() === m
  }).length
}

export function countOffersTouchedInMonth(applications: Application[], offsetFromCurrent: number, now = new Date()) {
  const target = shiftMonth(now, offsetFromCurrent)
  const y = target.getFullYear()
  const m = target.getMonth()
  return applications.filter(a => {
    if (a.status !== 'offer') return false
    const d = new Date(a.updated_at)
    return d.getFullYear() === y && d.getMonth() === m
  }).length
}

const FUNNEL_STAGES = ['applied', 'screening', 'interview', 'offer', 'hired'] as const

export function workspaceFunnelCounts(applications: Application[]) {
  return FUNNEL_STAGES.map(stage => ({
    stage,
    count: applications.filter(a => a.status === stage).length,
  }))
}

export function applicantsPerJob(jobs: Job[], applications: Application[], topN = 8) {
  const counts = new Map<number, number>()
  for (const a of applications) {
    counts.set(a.job_id, (counts.get(a.job_id) ?? 0) + 1)
  }
  const rows = jobs
    .map(job => ({
      jobId: job.id,
      title: job.title,
      count: counts.get(job.id) ?? 0,
    }))
    .filter(r => r.count > 0)
    .sort((a, b) => b.count - a.count)
  const head = rows.slice(0, topN)
  const rest = rows.slice(topN)
  const other = rest.reduce((s, r) => s + r.count, 0)
  if (other > 0) {
    head.push({ jobId: -1, title: 'Other roles', count: other })
  }
  return head
}

export type ActivityFeedItem = {
  id: string
  title: string
  subtitle: string
  at: string
}

export function buildActivityFeed(
  applications: Application[],
  interviews: InterviewAssignmentRow[],
  jobs: Job[],
  limit = 14,
): ActivityFeedItem[] {
  const jobTitle = (jobId: number) => jobs.find(j => j.id === jobId)?.title ?? `Job #${jobId}`

  const recentApps = [...applications]
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    .slice(0, 120)

  const fromApps: ActivityFeedItem[] = recentApps.map(app => {
    const history = [...(app.stage_history ?? [])].sort(
      (a, b) => new Date(b.changed_at).getTime() - new Date(a.changed_at).getTime(),
    )
    const latest = history[0]
    const name = app.candidate_name || app.candidate_email
    if (latest) {
      return {
        id: `app-${app.id}-${latest.changed_at}`,
        title: `${name} → ${formatStageLabel(latest.stage)}`,
        subtitle: jobTitle(app.job_id),
        at: latest.changed_at,
      }
    }
    return {
      id: `app-${app.id}-created`,
      title: `${name} applied`,
      subtitle: jobTitle(app.job_id),
      at: app.created_at,
    }
  })

  const recentInts = [...interviews].sort((a, b) => {
    const ta = a.scheduled_at ? new Date(a.scheduled_at).getTime() : 0
    const tb = b.scheduled_at ? new Date(b.scheduled_at).getTime() : 0
    return tb - ta
  }).slice(0, 80)

  const fromInterviews: ActivityFeedItem[] = recentInts
    .filter(r => r.scheduled_at)
    .map(r => {
      const jid = r.application?.job_id
      const sub = r.job?.title ?? (jid != null ? jobTitle(jid) : 'Interview')
      return {
        id: `int-${r.id}`,
        title: `Interview scheduled${
          r.application?.candidate_name || r.application?.candidate_email
            ? ` · ${r.application?.candidate_name || r.application?.candidate_email}`
            : ''
        }`,
        subtitle: sub,
        at: r.scheduled_at as string,
      }
    })

  return [...fromApps, ...fromInterviews]
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .slice(0, limit)
}

function formatStageLabel(value: string) {
  return value.replace(/_/g, ' ').replace(/\b\w/g, ch => ch.toUpperCase())
}

export function dominantApplicantStage(apps: Application[]): string {
  if (apps.length === 0) return '—'
  const tally: Record<string, number> = {}
  for (const a of apps) {
    tally[a.status] = (tally[a.status] ?? 0) + 1
  }
  let best = apps[0].status
  let bestN = 0
  for (const [k, v] of Object.entries(tally)) {
    if (v > bestN) {
      best = k
      bestN = v
    }
  }
  return formatStageLabel(best)
}
