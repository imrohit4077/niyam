import { formatDashboardLabel } from './dashboardUtils'
import type { Application } from '../../api/applications'
import type { InterviewAssignmentRow } from '../../api/interviews'

export type ActivityItem = {
  id: string
  at: number
  label: string
  detail: string
  kind: 'application' | 'interview'
}

export function buildActivityFeed(
  applications: Application[],
  interviews: InterviewAssignmentRow[],
  maxItems = 14,
): ActivityItem[] {
  const items: ActivityItem[] = []

  for (const app of applications) {
    const hist = app.stage_history ?? []
    const t = new Date(app.updated_at).getTime()
    if (hist.length > 1) {
      const last = hist[hist.length - 1]
      items.push({
        id: `app-${app.id}-stage`,
        at: new Date(last.changed_at).getTime() || t,
        label: 'Pipeline update',
        detail: `${app.candidate_name || app.candidate_email} → ${formatDashboardLabel(last.stage)}`,
        kind: 'application',
      })
    } else {
      items.push({
        id: `app-${app.id}-new`,
        at: new Date(app.created_at).getTime(),
        label: 'New applicant',
        detail: `${app.candidate_name || app.candidate_email} applied`,
        kind: 'application',
      })
    }
  }

  for (const row of interviews) {
    const name = row.application?.candidate_name || row.application?.candidate_email || 'Candidate'
    const jobTitle = row.job?.title ?? 'Role'
    const t = row.scheduled_at
      ? new Date(row.scheduled_at).getTime()
      : new Date(row.created_at).getTime()
    items.push({
      id: `int-${row.id}`,
      at: t,
      label: 'Interview',
      detail: `${name} · ${jobTitle} (${formatDashboardLabel(row.status)})`,
      kind: 'interview',
    })
  }

  items.sort((a, b) => b.at - a.at)
  return items.slice(0, maxItems)
}
