import type { Application } from '../../api/applications'
import type { InterviewAssignmentRow } from '../../api/interviews'

export type ActivityFeedItem = {
  id: string
  title: string
  subtitle: string
  at: string
  kind: 'application' | 'interview'
}

function formatShortDate(iso: string) {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function formatStageLabel(status: string) {
  return status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

/** Merge recent applications and interview events for the activity panel. */
export function buildActivityFeed(
  applications: Application[],
  interviews: InterviewAssignmentRow[],
  maxItems: number,
): ActivityFeedItem[] {
  const fromApps: ActivityFeedItem[] = applications.map(app => ({
    id: `app-${app.id}`,
    kind: 'application' as const,
    title: 'Candidate applied',
    subtitle: `${app.candidate_name || app.candidate_email} · ${formatStageLabel(app.status)}`,
    at: app.created_at,
  }))

  const fromInterviews: ActivityFeedItem[] = interviews
    .filter(row => row.scheduled_at || row.status === 'scheduled' || row.status === 'pending')
    .map(row => ({
      id: `int-${row.id}`,
      kind: 'interview' as const,
      title: row.scheduled_at ? 'Interview scheduled' : 'Interview update',
      subtitle: `${row.application?.candidate_name || row.application?.candidate_email || 'Candidate'} · ${row.job?.title ?? 'Job'}`,
      at: row.scheduled_at || row.updated_at || row.created_at,
    }))

  return [...fromApps, ...fromInterviews]
    .filter(item => item.at)
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .slice(0, maxItems)
    .map(item => ({
      ...item,
      at: formatShortDate(item.at),
    }))
}
