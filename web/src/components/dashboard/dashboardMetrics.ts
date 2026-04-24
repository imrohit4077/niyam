import type { Application } from '../../api/applications'
import type { InterviewAssignmentRow } from '../../api/interviews'
import type { Job } from '../../api/jobs'

export const PIPELINE_FUNNEL_STAGES = ['applied', 'screening', 'interview', 'offer', 'hired'] as const

export type PipelineStage = (typeof PIPELINE_FUNNEL_STAGES)[number]

export function formatDashboardLabel(value: string) {
  return value.replace(/_/g, ' ').replace(/\b\w/g, ch => ch.toUpperCase())
}

export function countApplicationsInRange(
  applications: Application[],
  start: Date,
  end: Date,
): number {
  const a = start.getTime()
  const b = end.getTime()
  return applications.filter(app => {
    const t = new Date(app.created_at).getTime()
    return t >= a && t < b
  }).length
}

export function trendVsPriorPercent(current: number, previous: number): { direction: 'up' | 'down' | 'flat'; pct: number } {
  if (previous === 0 && current === 0) return { direction: 'flat', pct: 0 }
  if (previous === 0) return { direction: 'up', pct: 100 }
  const raw = ((current - previous) / previous) * 100
  const pct = Math.round(Math.abs(raw))
  if (raw > 0.5) return { direction: 'up', pct }
  if (raw < -0.5) return { direction: 'down', pct }
  return { direction: 'flat', pct: 0 }
}

export function funnelCountsFromApplications(applications: Application[]): Record<PipelineStage, number> {
  const out: Record<PipelineStage, number> = {
    applied: 0,
    screening: 0,
    interview: 0,
    offer: 0,
    hired: 0,
  }
  for (const app of applications) {
    const s = app.status as string
    if (s in out) out[s as PipelineStage] += 1
  }
  return out
}

export type ActivityFeedItem = {
  id: string
  at: number
  title: string
  detail: string
  kind: 'application' | 'interview' | 'stage'
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
      id: `app-${app.id}`,
      at: new Date(app.created_at).getTime(),
      title: 'Application received',
      detail: `${name} · ${jobTitle}`,
      kind: 'application',
    })
    const history = app.stage_history ?? []
    if (history.length > 1) {
      const last = history[history.length - 1]
      if (last?.changed_at) {
        items.push({
          id: `stage-${app.id}-${last.changed_at}`,
          at: new Date(last.changed_at).getTime(),
          title: `Moved to ${formatDashboardLabel(last.stage)}`,
          detail: `${name} · ${jobTitle}`,
          kind: 'stage',
        })
      }
    }
  }

  for (const row of interviews) {
    const name =
      row.application?.candidate_name || row.application?.candidate_email || 'Candidate'
    const jobTitle = row.job?.title ?? (row.application?.job_id ? jobsById.get(row.application.job_id)?.title : null) ?? 'Role'
    const at = row.scheduled_at
      ? new Date(row.scheduled_at).getTime()
      : new Date(row.created_at).getTime()
    items.push({
      id: `int-${row.id}`,
      at,
      title: row.scheduled_at ? 'Interview scheduled' : 'Interview activity',
      detail: `${name} · ${jobTitle}`,
      kind: 'interview',
    })
  }

  items.sort((x, y) => y.at - x.at)
  const seen = new Set<string>()
  const deduped: ActivityFeedItem[] = []
  for (const it of items) {
    const key = `${it.kind}|${it.title}|${it.detail}|${Math.floor(it.at / 60000)}`
    if (seen.has(key)) continue
    seen.add(key)
    deduped.push(it)
    if (deduped.length >= limit) break
  }
  return deduped.slice(0, limit)
}

export function formatRelativeTime(ts: number) {
  const diff = Date.now() - ts
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}d ago`
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function applicantsPerJob(applications: Application[], jobs: Job[], topN = 10) {
  const counts = new Map<number, number>()
  for (const app of applications) {
    counts.set(app.job_id, (counts.get(app.job_id) ?? 0) + 1)
  }
  const rows = jobs.map(job => ({
    job,
    count: counts.get(job.id) ?? 0,
  }))
  rows.sort((a, b) => b.count - a.count)
  return rows.slice(0, topN)
}

export function countStageEnteredInRange(
  applications: Application[],
  stage: string,
  start: Date,
  end: Date,
): number {
  const a = start.getTime()
  const b = end.getTime()
  let n = 0
  for (const app of applications) {
    for (const h of app.stage_history ?? []) {
      if (h.stage !== stage) continue
      const t = new Date(h.changed_at).getTime()
      if (t >= a && t < b) n += 1
    }
  }
  return n
}

export function countInterviewsScheduledInRange(
  interviews: InterviewAssignmentRow[],
  start: Date,
  end: Date,
): number {
  const a = start.getTime()
  const b = end.getTime()
  return interviews.filter(row => {
    if (!row.scheduled_at) return false
    const t = new Date(row.scheduled_at).getTime()
    return t >= a && t < b
  }).length
}

export function countJobsCreatedInRange(jobs: Job[], start: Date, end: Date): number {
  const a = start.getTime()
  const b = end.getTime()
  return jobs.filter(job => {
    const t = new Date(job.created_at).getTime()
    return t >= a && t < b
  }).length
}

export function dominantApplicationStatus(apps: Application[]): string | null {
  if (apps.length === 0) return null
  const tally: Record<string, number> = {}
  for (const a of apps) {
    tally[a.status] = (tally[a.status] ?? 0) + 1
  }
  let best = ''
  let n = 0
  for (const [k, v] of Object.entries(tally)) {
    if (v > n) {
      n = v
      best = k
    }
  }
  return best || null
}
