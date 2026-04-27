import type { Application } from '../../api/applications'
import type { InterviewAssignmentRow } from '../../api/interviews'
import type { Job } from '../../api/jobs'

export type ActivityFeedItem = {
  id: string
  at: string
  title: string
  detail: string
  kind: 'application' | 'interview' | 'job'
}

export function buildActivityFeedItems(
  applications: Application[],
  interviews: InterviewAssignmentRow[],
  jobs: Job[],
  maxItems = 14,
): ActivityFeedItem[] {
  const jobTitle = (jobId: number) => jobs.find(j => j.id === jobId)?.title ?? `Job #${jobId}`

  const fromApps: ActivityFeedItem[] = applications.map(app => {
    const history = app.stage_history ?? []
    const last = history.length ? history[history.length - 1] : null
    const at = last?.changed_at ?? app.updated_at
    const stageLabel = last?.stage ? last.stage.replace(/_/g, ' ') : app.status.replace(/_/g, ' ')
    const title =
      history.length > 1
        ? `Stage updated — ${stageLabel}`
        : app.created_at === app.updated_at
          ? 'New application'
          : `Application updated — ${stageLabel}`
    const name = app.candidate_name?.trim() || app.candidate_email
    return {
      id: `app-${app.id}-${at}`,
      at,
      title,
      detail: `${name} · ${jobTitle(app.job_id)}`,
      kind: 'application' as const,
    }
  })

  const fromInterviews: ActivityFeedItem[] = interviews.map(row => {
    const at = row.scheduled_at || row.updated_at || row.created_at || ''
    const name = row.application?.candidate_name?.trim() || row.application?.candidate_email || 'Candidate'
    const job = row.job?.title ?? jobTitle(row.application?.job_id ?? 0)
    return {
      id: `int-${row.id}`,
      at: at || new Date().toISOString(),
      title: `Interview ${row.status.replace(/_/g, ' ')}`,
      detail: `${name} · ${job}`,
      kind: 'interview' as const,
    }
  })

  const fromJobs: ActivityFeedItem[] = jobs.map(job => ({
    id: `job-${job.id}-${job.updated_at}`,
    at: job.updated_at,
    title: 'Job updated',
    detail: `${job.title} · ${job.status}`,
    kind: 'job' as const,
  }))

  return [...fromApps, ...fromInterviews, ...fromJobs]
    .filter(i => i.at)
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .slice(0, maxItems)
}
