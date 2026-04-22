import type { Application } from '../../api/applications'
import type { InterviewAssignmentRow } from '../../api/interviews'
import type { Job } from '../../api/jobs'
import { formatStageLabel } from './dashboardMetrics'

export type ActivityItem = {
  id: string
  at: string
  title: string
  meta: string
  kind: 'application' | 'stage' | 'interview'
}

function jobTitle(jobs: Job[], jobId: number) {
  return jobs.find(j => j.id === jobId)?.title ?? `Job #${jobId}`
}

function candidateLabel(a: Application) {
  return a.candidate_name?.trim() || a.candidate_email || 'Candidate'
}

export function buildDashboardActivity(
  applications: Application[],
  interviews: InterviewAssignmentRow[],
  jobs: Job[],
  limit = 22,
): ActivityItem[] {
  const items: ActivityItem[] = []
  const appsForFeed = [...applications]
    .sort((x, y) => new Date(y.updated_at).getTime() - new Date(x.updated_at).getTime())
    .slice(0, 200)

  for (const a of appsForFeed) {
    const jt = jobTitle(jobs, a.job_id)
    const name = candidateLabel(a)
    items.push({
      id: `app-${a.id}-created`,
      at: a.created_at,
      title: `${name} applied`,
      meta: jt,
      kind: 'application',
    })
    const history = (a.stage_history ?? []).slice(-8)
    for (let i = 0; i < history.length; i += 1) {
      const h = history[i]
      if (!h?.changed_at) continue
      if (i === 0 && h.stage === 'applied') continue
      items.push({
        id: `app-${a.id}-stage-${i}-${h.changed_at}`,
        at: h.changed_at,
        title: `${name} → ${formatStageLabel(h.stage)}`,
        meta: jt,
        kind: 'stage',
      })
    }
  }

  for (const row of interviews) {
    const at = row.scheduled_at || row.created_at
    const name = row.application?.candidate_name?.trim() || row.application?.candidate_email || 'Candidate'
    const jt = row.job?.title ?? (row.application?.job_id != null ? jobTitle(jobs, row.application.job_id) : 'Interview')
    items.push({
      id: `int-${row.id}`,
      at,
      title: `Interview ${formatStageLabel(row.status)} — ${name}`,
      meta: jt,
      kind: 'interview',
    })
  }

  return items
    .sort((x, y) => new Date(y.at).getTime() - new Date(x.at).getTime())
    .slice(0, limit)
}
