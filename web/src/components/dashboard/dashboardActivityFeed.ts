import type { Application } from '../../api/applications'
import type { InterviewAssignmentRow } from '../../api/interviews'

export type ActivityItem = {
  id: string
  at: string
  title: string
  detail: string
  href?: string
}

function formatDashboardLabel(value: string) {
  return value.replace(/_/g, ' ').replace(/\b\w/g, ch => ch.toUpperCase())
}

export function buildActivityFeed(
  applications: Application[],
  interviews: InterviewAssignmentRow[],
  accountId: string,
  limit = 12,
): ActivityItem[] {
  const items: ActivityItem[] = []

  for (const app of applications) {
    const name = app.candidate_name || app.candidate_email
    items.push({
      id: `app-created-${app.id}`,
      at: app.created_at,
      title: 'Candidate applied',
      detail: `${name} · Job #${app.job_id}`,
      href: `/account/${accountId}/applications/${app.id}`,
    })
    const lastStage = app.stage_history?.length
      ? app.stage_history[app.stage_history.length - 1]
      : null
    if (lastStage && lastStage.changed_at !== app.created_at) {
      items.push({
        id: `app-stage-${app.id}-${lastStage.changed_at}`,
        at: lastStage.changed_at,
        title: 'Stage updated',
        detail: `${name} → ${formatDashboardLabel(lastStage.stage)}`,
        href: `/account/${accountId}/applications/${app.id}`,
      })
    }
  }

  for (const row of interviews) {
    if (row.scheduled_at) {
      const cand = row.application?.candidate_name || row.application?.candidate_email || 'Candidate'
      items.push({
        id: `int-${row.id}-sched`,
        at: row.scheduled_at,
        title: 'Interview scheduled',
        detail: `${cand} · ${row.job?.title ?? 'Job'}`,
        href: `/account/${accountId}/interviews`,
      })
    }
  }

  items.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
  return items.slice(0, limit)
}
