import type { Application } from '../../api/applications'
import type { Job } from '../../api/jobs'

export type DashboardActivityItem = {
  id: string
  message: string
  detail: string
  at: string
}

function formatDashboardLabel(value: string) {
  return value
    .replace(/_/g, ' ')
    .replace(/\b\w/g, ch => ch.toUpperCase())
}

function jobTitle(jobs: Job[], jobId: number) {
  return jobs.find(j => j.id === jobId)?.title ?? `Job #${jobId}`
}

/**
 * Recent activity from applications (stage transitions + new applications).
 */
export function buildActivityFeed(applications: Application[], jobs: Job[], limit = 14): DashboardActivityItem[] {
  const rows: DashboardActivityItem[] = []

  for (const app of applications) {
    const name = app.candidate_name?.trim() || app.candidate_email
    const jobName = jobTitle(jobs, app.job_id)
    const history = [...(app.stage_history ?? [])].sort(
      (a, b) => new Date(b.changed_at).getTime() - new Date(a.changed_at).getTime(),
    )
    const latest = history[0]

    if (latest) {
      rows.push({
        id: `h-${app.id}-${latest.changed_at}`,
        message: `${name} → ${formatDashboardLabel(latest.stage)}`,
        detail: jobName,
        at: latest.changed_at,
      })
    } else {
      rows.push({
        id: `c-${app.id}`,
        message: `${name} applied`,
        detail: jobName,
        at: app.created_at,
      })
    }
  }

  return rows.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime()).slice(0, limit)
}
