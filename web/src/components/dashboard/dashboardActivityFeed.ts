import type { Application } from '../../api/applications'
import type { InterviewAssignmentRow } from '../../api/interviews'

export type ActivityItem = {
  id: string
  title: string
  subtitle: string
  /** ISO timestamp for sorting and `<time dateTime>`. */
  at: string
  timeLabel: string
  kind: 'application' | 'interview' | 'hire' | 'offer'
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function formatName(app: Application) {
  return app.candidate_name?.trim() || app.candidate_email || 'Candidate'
}

export function buildActivityFeed(
  applications: Application[],
  interviews: InterviewAssignmentRow[],
  jobTitleById: Map<number, string>,
  limit = 10,
): ActivityItem[] {
  const fromApps: ActivityItem[] = applications.map(app => {
    const jobTitle = jobTitleById.get(app.job_id) ?? `Job #${app.job_id}`
    let kind: ActivityItem['kind'] = 'application'
    let title = 'Candidate applied'
    let at = app.created_at
    if (app.status === 'hired') {
      kind = 'hire'
      title = 'Candidate hired'
      at = app.updated_at
    } else if (app.status === 'offer') {
      kind = 'offer'
      title = 'Moved to offer'
      at = app.updated_at
    }
    return {
      id: `app-${app.id}`,
      title,
      subtitle: `${formatName(app)} · ${jobTitle}`,
      at,
      timeLabel: formatTime(at),
      kind,
    }
  })

  const fromInterviews: ActivityItem[] = interviews
    .filter(row => row.scheduled_at)
    .map(row => {
      const name = row.application?.candidate_name || row.application?.candidate_email || 'Candidate'
      const jobTitle = row.job?.title ?? jobTitleById.get(row.application?.job_id ?? 0) ?? 'Role'
      const at = row.scheduled_at!
      return {
        id: `int-${row.id}`,
        title: 'Interview scheduled',
        subtitle: `${name} · ${jobTitle}`,
        at,
        timeLabel: formatTime(at),
        kind: 'interview' as const,
      }
    })

  return [...fromApps, ...fromInterviews]
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .slice(0, limit)
}
