import type { Application } from '../../api/applications'
import type { InterviewAssignmentRow } from '../../api/interviews'
import type { Job } from '../../api/jobs'

export const FUNNEL_STAGES = ['applied', 'screening', 'interview', 'offer', 'hired'] as const
export type FunnelStage = (typeof FUNNEL_STAGES)[number]

export function formatDashboardLabel(value: string) {
  return value.replace(/_/g, ' ').replace(/\b\w/g, ch => ch.toUpperCase())
}

export function countInDateRange<T extends { created_at?: string | null; updated_at?: string | null }>(
  items: T[],
  useField: 'created_at' | 'updated_at',
  start: Date,
  end: Date,
  filter?: (item: T) => boolean,
) {
  return items.filter(item => {
    if (filter && !filter(item)) return false
    const raw = useField === 'created_at' ? item.created_at : item.updated_at
    if (!raw) return false
    const t = new Date(raw).getTime()
    return t >= start.getTime() && t < end.getTime()
  }).length
}

export function trendPercent(current: number, previous: number): { direction: 'up' | 'down' | 'flat'; percent: number } {
  if (previous === 0 && current === 0) return { direction: 'flat', percent: 0 }
  if (previous === 0) return { direction: 'up', percent: 100 }
  const raw = ((current - previous) / previous) * 100
  const rounded = Math.round(Math.abs(raw))
  if (raw > 0.5) return { direction: 'up', percent: rounded }
  if (raw < -0.5) return { direction: 'down', percent: rounded }
  return { direction: 'flat', percent: 0 }
}

export function funnelCountsFromApplications(applications: Application[]) {
  const byStatus = applications.reduce<Record<string, number>>((acc, a) => {
    acc[a.status] = (acc[a.status] ?? 0) + 1
    return acc
  }, {})
  return FUNNEL_STAGES.map(stage => ({
    stage,
    label: formatDashboardLabel(stage),
    value: byStatus[stage] ?? 0,
  }))
}

export function applicantsPerJob(applications: Application[], jobs: Job[], limit = 12) {
  const counts = applications.reduce<Record<number, number>>((acc, a) => {
    acc[a.job_id] = (acc[a.job_id] ?? 0) + 1
    return acc
  }, {})
  return jobs
    .map(job => ({ job, count: counts[job.id] ?? 0 }))
    .filter(row => row.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, limit)
}

export function dominantApplicantStage(jobId: number, applications: Application[]) {
  const forJob = applications.filter(a => a.job_id === jobId)
  if (forJob.length === 0) return '—'
  const tallies = forJob.reduce<Record<string, number>>((acc, a) => {
    acc[a.status] = (acc[a.status] ?? 0) + 1
    return acc
  }, {})
  let best = ''
  let bestN = -1
  for (const [status, n] of Object.entries(tallies)) {
    if (n > bestN) {
      best = status
      bestN = n
    }
  }
  return formatDashboardLabel(best)
}

export type ActivityItem = {
  id: string
  at: string
  title: string
  meta: string
}

export function buildActivityFeed(
  applications: Application[],
  interviews: InterviewAssignmentRow[],
  jobTitleById: Map<number, string>,
  limit = 14,
): ActivityItem[] {
  const items: ActivityItem[] = []

  for (const app of applications) {
    const jobTitle = jobTitleById.get(app.job_id) ?? `Job #${app.job_id}`
    const name = app.candidate_name?.trim() || app.candidate_email || 'Candidate'
    items.push({
      id: `app-created-${app.id}`,
      at: app.created_at,
      title: 'Application received',
      meta: `${name} · ${jobTitle}`,
    })
    const history = app.stage_history ?? []
    if (history.length > 0) {
      const last = history[history.length - 1]
      if (last?.changed_at && last.changed_at !== app.created_at) {
        items.push({
          id: `app-stage-${app.id}-${last.changed_at}`,
          at: last.changed_at,
          title: `Stage updated to ${formatDashboardLabel(last.stage)}`,
          meta: `${name} · ${jobTitle}`,
        })
      }
    }
  }

  for (const row of interviews) {
    const name =
      row.application?.candidate_name?.trim() || row.application?.candidate_email || 'Candidate'
    const jobTitle = row.job?.title ?? jobTitleById.get(row.application?.job_id ?? 0) ?? 'Role'
    if (row.scheduled_at) {
      items.push({
        id: `int-sched-${row.id}`,
        at: row.scheduled_at,
        title: 'Interview scheduled',
        meta: `${name} · ${jobTitle}`,
      })
    } else if (row.status === 'scheduled' || row.status === 'pending') {
      items.push({
        id: `int-open-${row.id}`,
        at: row.updated_at || row.created_at,
        title: `Interview ${formatDashboardLabel(row.status)}`,
        meta: `${name} · ${jobTitle}`,
      })
    }
  }

  items.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
  const seen = new Set<string>()
  const deduped: ActivityItem[] = []
  for (const row of items) {
    const key = `${row.title}|${row.meta}|${row.at.slice(0, 16)}`
    if (seen.has(key)) continue
    seen.add(key)
    deduped.push(row)
    if (deduped.length >= limit) break
  }
  return deduped
}
