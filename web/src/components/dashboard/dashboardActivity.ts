import type { Application } from '../../api/applications'
import type { InterviewAssignmentRow } from '../../api/interviews'

export type ActivityFeedItem = {
  id: string
  title: string
  subtitle: string
  at: string
  kind: 'application' | 'interview'
}

function formatDashboardLabel(value: string) {
  return value.replace(/_/g, ' ').replace(/\b\w/g, ch => ch.toUpperCase())
}

function latestStageLabel(application: Application): string {
  const history = application.stage_history
  if (history && history.length > 0) {
    const last = history[history.length - 1]
    return formatDashboardLabel(last.stage || application.status)
  }
  return formatDashboardLabel(application.status)
}

/** Merge recent applications and interviews into a single timeline (newest first). */
export function buildActivityFeed(
  applications: Application[],
  interviews: InterviewAssignmentRow[],
  maxItems = 14,
): ActivityFeedItem[] {
  const fromApps: ActivityFeedItem[] = applications
    .slice()
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    .slice(0, 20)
    .map(application => ({
      id: `app-${application.id}`,
      kind: 'application' as const,
      title: application.candidate_name || application.candidate_email || 'Candidate',
      subtitle: `Application · ${latestStageLabel(application)}`,
      at: application.updated_at,
    }))

  const fromInterviews: ActivityFeedItem[] = interviews
    .filter(row => !!row.scheduled_at || !!row.updated_at)
    .slice()
    .sort((a, b) => {
      const ta = new Date(a.scheduled_at || a.updated_at).getTime()
      const tb = new Date(b.scheduled_at || b.updated_at).getTime()
      return tb - ta
    })
    .slice(0, 12)
    .map(row => ({
      id: `int-${row.id}`,
      kind: 'interview' as const,
      title: row.application?.candidate_name || row.application?.candidate_email || 'Interview',
      subtitle: `Interview ${row.job?.title ? `· ${row.job.title}` : ''} · ${formatDashboardLabel(row.status)}`.trim(),
      at: row.scheduled_at || row.updated_at,
    }))

  return [...fromApps, ...fromInterviews]
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .slice(0, maxItems)
}
