import type { Application } from '../../api/applications'
import type { InterviewAssignmentRow } from '../../api/interviews'
import type { Job } from '../../api/jobs'

export type DashboardActivityItem = {
  id: string
  at: number
  title: string
  subtitle: string
  kind: 'application' | 'stage' | 'interview'
}

const MAX_ITEMS = 14

function jobTitle(jobs: Job[], jobId: number) {
  return jobs.find(j => j.id === jobId)?.title ?? `Job #${jobId}`
}

function candidateLabel(app: Application) {
  return app.candidate_name?.trim() || app.candidate_email || 'Candidate'
}

/**
 * Merges recent applications, stage history, and interviews into a single timeline.
 */
export function buildDashboardActivity(
  applications: Application[],
  interviews: InterviewAssignmentRow[],
  jobs: Job[],
): DashboardActivityItem[] {
  const items: DashboardActivityItem[] = []

  for (const app of applications) {
    const jt = jobTitle(jobs, app.job_id)
    const name = candidateLabel(app)
    items.push({
      id: `app-created-${app.id}`,
      at: new Date(app.created_at).getTime(),
      title: 'Application received',
      subtitle: `${name} · ${jt}`,
      kind: 'application',
    })
    const history = app.stage_history ?? []
    for (let i = 0; i < history.length; i++) {
      const h = history[i]
      if (!h?.changed_at) continue
      items.push({
        id: `app-stage-${app.id}-${i}-${h.changed_at}`,
        at: new Date(h.changed_at).getTime(),
        title: `Stage updated to ${h.stage.replace(/_/g, ' ')}`,
        subtitle: `${name} · ${jt}`,
        kind: 'stage',
      })
    }
  }

  for (const row of interviews) {
    const scheduled = row.scheduled_at
    if (!scheduled) continue
    const name = row.application?.candidate_name?.trim() || row.application?.candidate_email || 'Candidate'
    const jt =
      row.job?.title ??
      (row.application?.job_id != null ? jobTitle(jobs, row.application.job_id) : 'Role')
    items.push({
      id: `int-${row.id}-${scheduled}`,
      at: new Date(scheduled).getTime(),
      title: 'Interview scheduled',
      subtitle: `${name} · ${jt}`,
      kind: 'interview',
    })
  }

  return items
    .filter(x => Number.isFinite(x.at))
    .sort((a, b) => b.at - a.at)
    .slice(0, MAX_ITEMS)
}
