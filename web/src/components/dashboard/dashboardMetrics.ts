import type { Application } from '../../api/applications'
import type { InterviewAssignmentRow } from '../../api/interviews'
import type { Job } from '../../api/jobs'

export const DASHBOARD_CHART_COLORS = [
  '#0ea5e9',
  '#3b82f6',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#6b7280',
  '#8b5cf6',
]

export const FUNNEL_STAGES = ['applied', 'screening', 'interview', 'offer', 'hired'] as const

export type FunnelStage = (typeof FUNNEL_STAGES)[number]

/** Rolling window comparison: current vs previous period of equal length. */
export function periodTrend(
  items: { at: number }[],
  windowDays: number,
): { current: number; previous: number; percentChange: number | null } {
  const now = Date.now()
  const ms = windowDays * 86400000
  const curStart = now - ms
  const prevStart = now - 2 * ms
  let current = 0
  let previous = 0
  for (const { at } of items) {
    if (at >= curStart) current++
    else if (at >= prevStart && at < curStart) previous++
  }
  let percentChange: number | null = null
  if (previous > 0) percentChange = Math.round(((current - previous) / previous) * 100)
  else if (current > 0) percentChange = 100
  else percentChange = 0
  return { current, previous, percentChange }
}

export function applicationCreatedEvents(apps: Application[]) {
  return apps.map(a => ({ at: new Date(a.created_at).getTime() }))
}

export function funnelCountsFromApplications(apps: Application[]): Record<FunnelStage, number> {
  const base: Record<FunnelStage, number> = {
    applied: 0,
    screening: 0,
    interview: 0,
    offer: 0,
    hired: 0,
  }
  for (const app of apps) {
    const s = app.status as string
    if (s in base) base[s as FunnelStage] += 1
  }
  return base
}

export type ActivityKind = 'application' | 'stage' | 'interview'

export type ActivityFeedItem = {
  id: string
  kind: ActivityKind
  title: string
  subtitle: string
  at: number
}

export function formatStageLabel(stage: string) {
  return stage.replace(/_/g, ' ').replace(/\b\w/g, ch => ch.toUpperCase())
}

export function buildActivityFeed(
  apps: Application[],
  interviews: InterviewAssignmentRow[],
  limit = 14,
): ActivityFeedItem[] {
  const items: ActivityFeedItem[] = []

  for (const app of apps) {
    const name = app.candidate_name || app.candidate_email
    items.push({
      id: `app-created-${app.id}`,
      kind: 'application',
      title: `Candidate applied`,
      subtitle: `${name} · Application #${app.id}`,
      at: new Date(app.created_at).getTime(),
    })
    const hist = [...(app.stage_history ?? [])].sort(
      (a, b) => new Date(a.changed_at).getTime() - new Date(b.changed_at).getTime(),
    )
    for (let i = 1; i < hist.length; i++) {
      const row = hist[i]
      const at = new Date(row.changed_at).getTime()
      if (!Number.isFinite(at)) continue
      items.push({
        id: `app-stage-${app.id}-${i}-${row.changed_at}`,
        kind: 'stage',
        title: `Stage updated to ${formatStageLabel(row.stage)}`,
        subtitle: `${name} · Application #${app.id}`,
        at,
      })
    }
  }

  for (const row of interviews) {
    const cand = row.application?.candidate_name || row.application?.candidate_email || 'Candidate'
    const jobTitle = row.job?.title ?? `Job #${row.application?.job_id ?? '—'}`
    const at = row.scheduled_at
      ? new Date(row.scheduled_at).getTime()
      : new Date(row.updated_at ?? row.created_at ?? Date.now()).getTime()
    if (!Number.isFinite(at)) continue
    items.push({
      id: `int-${row.id}`,
      kind: 'interview',
      title:
        row.status === 'scheduled' || row.status === 'pending'
          ? 'Interview scheduled'
          : `Interview ${formatStageLabel(row.status)}`,
      subtitle: `${cand} · ${jobTitle}`,
      at,
    })
  }

  items.sort((a, b) => b.at - a.at)
  return items.slice(0, limit)
}

export function openJobCreatedEvents(jobs: Job[]) {
  return jobs.filter(j => j.status === 'open').map(j => ({ at: new Date(j.created_at).getTime() }))
}

export function interviewScheduledEvents(rows: InterviewAssignmentRow[]) {
  return rows
    .filter(r => r.scheduled_at)
    .map(r => ({ at: new Date(r.scheduled_at as string).getTime() }))
    .filter(({ at }) => Number.isFinite(at))
}

export function offerStageEvents(apps: Application[]) {
  return apps
    .filter(a => a.status === 'offer')
    .map(a => ({ at: new Date(a.updated_at).getTime() }))
    .filter(({ at }) => Number.isFinite(at))
}

export function dominantApplicantStage(jobId: number, apps: Application[]): string {
  const forJob = apps.filter(a => a.job_id === jobId)
  if (forJob.length === 0) return '—'
  const counts: Record<string, number> = {}
  for (const a of forJob) {
    counts[a.status] = (counts[a.status] ?? 0) + 1
  }
  let best = ''
  let n = 0
  for (const [k, v] of Object.entries(counts)) {
    if (v > n) {
      n = v
      best = k
    }
  }
  return best ? formatStageLabel(best) : '—'
}
