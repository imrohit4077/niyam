import type { Application } from '../api/applications'
import type { InterviewAssignmentRow } from '../api/interviews'
import type { Job } from '../api/jobs'

const MS_DAY = 86_400_000

export type TrendDirection = 'up' | 'down' | 'flat'

export type TrendResult = {
  direction: TrendDirection
  pct: number | null
  label: string
}

/** Percent change vs prior window; null pct when previous is 0. */
export function computeTrend(current: number, previous: number): TrendResult {
  if (previous === 0 && current === 0) {
    return { direction: 'flat', pct: 0, label: '0%' }
  }
  if (previous === 0) {
    return { direction: 'up', pct: null, label: 'New' }
  }
  const raw = ((current - previous) / previous) * 100
  const rounded = Math.round(raw * 10) / 10
  const direction: TrendDirection = rounded > 0.5 ? 'up' : rounded < -0.5 ? 'down' : 'flat'
  return {
    direction,
    pct: rounded,
    label: `${rounded > 0 ? '+' : ''}${rounded}%`,
  }
}

function inRange(iso: string, start: Date, end: Date) {
  const t = new Date(iso).getTime()
  return t >= start.getTime() && t < end.getTime()
}

export function countApplicationsCreatedInRange(applications: Application[], start: Date, end: Date) {
  return applications.filter(a => inRange(a.created_at, start, end)).length
}

export function countOffersTouchedInRange(applications: Application[], start: Date, end: Date) {
  return applications.filter(
    a => a.status === 'offer' && inRange(a.updated_at, start, end),
  ).length
}

/** New jobs created in range (any status), for trend proxy. */
export function countJobsCreatedInRange(jobs: Job[], start: Date, end: Date) {
  return jobs.filter(j => inRange(j.created_at, start, end)).length
}

/** Interviews with scheduled_at in [start, end). */
export function countInterviewsScheduledInRange(rows: InterviewAssignmentRow[], start: Date, end: Date) {
  return rows.filter(r => {
    if (!r.scheduled_at) return false
    return inRange(r.scheduled_at, start, end)
  }).length
}

export type FunnelStage = 'applied' | 'screening' | 'interview' | 'offer' | 'hired'

export function pipelineFunnelCounts(applications: Application[]): Record<FunnelStage, number> {
  const base: Record<FunnelStage, number> = {
    applied: 0,
    screening: 0,
    interview: 0,
    offer: 0,
    hired: 0,
  }
  for (const a of applications) {
    const s = a.status as string
    if (s in base) base[s as FunnelStage] += 1
  }
  return base
}

export type ActivityItem = {
  id: string
  at: string
  title: string
  subtitle: string
  kind: 'application' | 'stage' | 'interview'
}

export function buildActivityFeed(
  applications: Application[],
  interviews: InterviewAssignmentRow[],
  limit = 14,
): ActivityItem[] {
  const items: ActivityItem[] = []

  const recentApps = [...applications]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 40)

  for (const app of recentApps) {
    items.push({
      id: `app-${app.id}-created`,
      at: app.created_at,
      title: 'Candidate added',
      subtitle: `${app.candidate_name || app.candidate_email} · Job #${app.job_id}`,
      kind: 'application',
    })
    const history = [...(app.stage_history ?? [])].sort(
      (a, b) => new Date(b.changed_at).getTime() - new Date(a.changed_at).getTime(),
    )
    for (let i = 0; i < Math.min(2, history.length); i++) {
      const h = history[i]
      if (!h?.changed_at) continue
      items.push({
        id: `app-${app.id}-stage-${i}-${h.changed_at}`,
        at: h.changed_at,
        title: `Moved to ${formatStageLabel(h.stage)}`,
        subtitle: `${app.candidate_name || app.candidate_email}`,
        kind: 'stage',
      })
    }
  }

  for (const row of interviews) {
    const at = row.scheduled_at || row.updated_at
    if (!at) continue
    const name = row.application?.candidate_name || row.application?.candidate_email || 'Candidate'
    const jobTitle = row.job?.title ?? `Job #${row.application?.job_id ?? '—'}`
    items.push({
      id: `int-${row.id}`,
      at,
      title: row.scheduled_at ? 'Interview scheduled' : 'Interview updated',
      subtitle: `${name} · ${jobTitle}`,
      kind: 'interview',
    })
  }

  items.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
  return items.slice(0, limit)
}

function formatStageLabel(stage: string) {
  return stage.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

export function applicantsPerJob(applications: Application[], jobs: Job[]): Map<number, number> {
  const m = new Map<number, number>()
  for (const j of jobs) m.set(j.id, 0)
  for (const a of applications) {
    m.set(a.job_id, (m.get(a.job_id) ?? 0) + 1)
  }
  return m
}

/** Dominant application status for a job (excluding empty). */
export function dominantStageForJob(jobId: number, applications: Application[]): string | null {
  const counts = new Map<string, number>()
  for (const a of applications) {
    if (a.job_id !== jobId) continue
    counts.set(a.status, (counts.get(a.status) ?? 0) + 1)
  }
  let best: string | null = null
  let bestN = 0
  for (const [status, n] of counts) {
    if (n > bestN) {
      bestN = n
      best = status
    }
  }
  return best
}

export function trendWindows() {
  const now = new Date()
  const d30 = new Date(now.getTime() - 30 * MS_DAY)
  const d60 = new Date(now.getTime() - 60 * MS_DAY)
  const d28 = new Date(now.getTime() - 28 * MS_DAY)
  return {
    now,
    last30Start: d30,
    prev30Start: d60,
    prev30End: d30,
    /** Next 14 days vs prior 14 days — for interview trend on dashboard. */
    next14End: new Date(now.getTime() + 14 * MS_DAY),
    prev14Start: d28,
    prev14End: now,
  }
}
