import type { Application } from '../api/applications'
import type { InterviewAssignmentRow } from '../api/interviews'
import type { Job } from '../api/jobs'

export type WorkspaceFunnelStage = 'applied' | 'screening' | 'interview' | 'offer' | 'hired'

const FUNNEL_ORDER: WorkspaceFunnelStage[] = ['applied', 'screening', 'interview', 'offer', 'hired']

export function workspaceFunnelCounts(applications: Application[]): Record<WorkspaceFunnelStage, number> {
  const base: Record<WorkspaceFunnelStage, number> = {
    applied: 0,
    screening: 0,
    interview: 0,
    offer: 0,
    hired: 0,
  }
  for (const app of applications) {
    const s = app.status as string
    if (s === 'hired') base.hired += 1
    else if (s === 'offer') base.offer += 1
    else if (s === 'interview') base.interview += 1
    else if (s === 'screening') base.screening += 1
    else if (s === 'applied') base.applied += 1
  }
  return base
}

/** Monotonic funnel: each stage includes everyone at that stage or later in the pipeline. */
export function funnelBarValues(counts: Record<WorkspaceFunnelStage, number>): number[] {
  let carry = 0
  return FUNNEL_ORDER.map(stage => {
    carry += counts[stage]
    return carry
  })
}

export function monthOverMonthTrend(current: number, previous: number): { pct: number; direction: 'up' | 'down' | 'flat' | 'new' } {
  if (previous === 0 && current === 0) return { pct: 0, direction: 'flat' }
  if (previous === 0 && current > 0) return { pct: 100, direction: 'new' }
  const raw = ((current - previous) / previous) * 100
  const pct = Math.round(Math.abs(raw))
  if (raw > 0.5) return { pct, direction: 'up' }
  if (raw < -0.5) return { pct, direction: 'down' }
  return { pct: 0, direction: 'flat' }
}

export function formatTrendLabel(direction: 'up' | 'down' | 'flat' | 'new', pct: number): string {
  if (direction === 'new') return '↑ New'
  if (direction === 'flat') return '— 0%'
  const arrow = direction === 'up' ? '↑' : '↓'
  return `${arrow} ${pct}%`
}

export type ActivityKind = 'application' | 'interview' | 'offer' | 'hire'

export type ActivityFeedItem = {
  id: string
  kind: ActivityKind
  title: string
  subtitle: string
  at: string
}

function formatShortDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function buildActivityFeed(params: {
  applications: Application[]
  interviews: InterviewAssignmentRow[]
  jobsById: Map<number, Job>
  limit?: number
}): ActivityFeedItem[] {
  const { applications, interviews, jobsById, limit = 12 } = params
  const items: ActivityFeedItem[] = []

  for (const app of applications) {
    const jobTitle = jobsById.get(app.job_id)?.title ?? `Job #${app.job_id}`
    const name = app.candidate_name || app.candidate_email
    if (app.status === 'hired') {
      items.push({
        id: `hire-${app.id}`,
        kind: 'hire',
        title: `${name} marked hired`,
        subtitle: jobTitle,
        at: app.updated_at,
      })
    } else if (app.status === 'offer') {
      items.push({
        id: `offer-${app.id}`,
        kind: 'offer',
        title: `Offer stage · ${name}`,
        subtitle: jobTitle,
        at: app.updated_at,
      })
    } else {
      items.push({
        id: `app-${app.id}`,
        kind: 'application',
        title: `Candidate added · ${name}`,
        subtitle: `${jobTitle} · ${formatShortDate(app.created_at)}`,
        at: app.created_at,
      })
    }
  }

  for (const row of interviews) {
    if (!row.scheduled_at && row.status !== 'scheduled' && row.status !== 'pending') continue
    const name = row.application?.candidate_name || row.application?.candidate_email || 'Candidate'
    const jobTitle = row.job?.title ?? (row.application?.job_id ? jobsById.get(row.application.job_id)?.title : null) ?? 'Interview'
    items.push({
      id: `int-${row.id}`,
      kind: 'interview',
      title: `Interview ${row.status === 'scheduled' ? 'scheduled' : 'updated'} · ${name}`,
      subtitle: jobTitle,
      at: row.scheduled_at || row.updated_at,
    })
  }

  items.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
  return items.slice(0, limit)
}
