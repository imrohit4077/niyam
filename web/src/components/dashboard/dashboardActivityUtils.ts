import type { Application } from '../../api/applications'
import type { InterviewAssignmentRow } from '../../api/interviews'

export type ActivityItem = {
  id: string
  at: string
  title: string
  subtitle: string
  kind: 'candidate' | 'interview' | 'offer' | 'hire'
}

export function buildActivityItems(
  applications: Application[],
  interviews: InterviewAssignmentRow[],
  maxItems: number,
): ActivityItem[] {
  const fromApps: ActivityItem[] = applications.map(app => {
    let kind: ActivityItem['kind'] = 'candidate'
    let title = 'Candidate applied'
    if (app.status === 'hired') {
      kind = 'hire'
      title = 'Candidate hired'
    } else if (app.status === 'offer') {
      kind = 'offer'
      title = 'Offer stage'
    }
    return {
      id: `app-${app.id}`,
      at: app.updated_at > app.created_at && (app.status === 'offer' || app.status === 'hired') ? app.updated_at : app.created_at,
      title,
      subtitle: `${app.candidate_name || app.candidate_email || 'Candidate'} · Job #${app.job_id}`,
      kind,
    }
  })

  const fromInterviews: ActivityItem[] = interviews
    .filter(row => row.scheduled_at || row.status === 'scheduled' || row.status === 'pending')
    .map(row => ({
      id: `int-${row.id}`,
      at: row.scheduled_at || row.updated_at,
      title: row.scheduled_at ? 'Interview scheduled' : 'Interview pending',
      subtitle: `${row.application?.candidate_name || row.application?.candidate_email || 'Candidate'} · ${row.job?.title ?? 'Job'}`,
      kind: 'interview' as const,
    }))

  return [...fromApps, ...fromInterviews]
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .slice(0, maxItems)
}
