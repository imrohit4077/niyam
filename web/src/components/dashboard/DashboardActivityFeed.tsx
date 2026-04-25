import { Link } from 'react-router-dom'
import type { Application } from '../../api/applications'
import type { InterviewAssignmentRow } from '../../api/interviews'
import { formatDashboardLabel } from './dashboardUtils'

export type ActivityItem = {
  id: string
  at: string
  title: string
  subtitle: string
  kind: 'application' | 'interview' | 'offer' | 'hire' | 'other'
  href?: string
}

function kindClass(kind: ActivityItem['kind']) {
  switch (kind) {
    case 'application':
      return 'dashboard-activity-dot--applied'
    case 'interview':
      return 'dashboard-activity-dot--interview'
    case 'offer':
      return 'dashboard-activity-dot--offer'
    case 'hire':
      return 'dashboard-activity-dot--hire'
    default:
      return 'dashboard-activity-dot--other'
  }
}

function formatRelative(at: string) {
  const d = new Date(at)
  const diff = Date.now() - d.getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}d ago`
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function buildActivities(
  applications: Application[],
  interviews: InterviewAssignmentRow[],
  accountId: string,
  limit: number,
): ActivityItem[] {
  const fromApps: ActivityItem[] = applications.map(a => {
    let kind: ActivityItem['kind'] = 'other'
    let title = 'Application updated'
    if (a.status === 'hired') {
      kind = 'hire'
      title = 'Candidate hired'
    } else if (a.status === 'offer') {
      kind = 'offer'
      title = 'Offer stage'
    } else if (a.status === 'applied' || a.status === 'screening') {
      kind = 'application'
      title = 'New application'
    } else if (a.status === 'interview') {
      kind = 'interview'
      title = 'Moved to interview'
    }
    const name = a.candidate_name || a.candidate_email
    return {
      id: `app-${a.id}-${a.updated_at}`,
      at: a.updated_at,
      title,
      subtitle: `${name} · ${formatDashboardLabel(a.status)}`,
      kind,
      href: `/account/${accountId}/jobs/${a.job_id}/edit`,
    }
  })

  const fromInterviews: ActivityItem[] = interviews.map(row => ({
    id: `int-${row.id}-${row.updated_at}`,
    at: row.updated_at,
    title: 'Interview activity',
    subtitle: `${row.application?.candidate_name || row.application?.candidate_email || 'Candidate'} · ${row.job?.title ?? 'Job'}`,
    kind: 'interview' as const,
    href: `/account/${accountId}/interviews`,
  }))

  return [...fromApps, ...fromInterviews]
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .slice(0, limit)
}

export function DashboardActivityFeed({
  applications,
  interviews,
  accountId,
  loading,
}: {
  applications: Application[]
  interviews: InterviewAssignmentRow[]
  accountId: string
  loading?: boolean
}) {
  if (loading) {
    return (
      <ul className="dashboard-activity-list">
        {Array.from({ length: 6 }).map((_, i) => (
          <li key={i} className="dashboard-activity-item">
            <div className="dashboard-skeleton dashboard-activity-skeleton-dot" />
            <div className="dashboard-activity-text">
              <div className="dashboard-skeleton dashboard-skeleton-line dashboard-skeleton-line--md" />
              <div className="dashboard-skeleton dashboard-skeleton-line dashboard-skeleton-line--sm" />
            </div>
          </li>
        ))}
      </ul>
    )
  }

  const items = buildActivities(applications, interviews, accountId, 12)

  if (items.length === 0) {
    return <div className="dashboard-empty dashboard-empty--compact">No recent activity yet.</div>
  }

  return (
    <ul className="dashboard-activity-list">
      {items.map(item => {
        const inner = (
          <>
            <span className={`dashboard-activity-dot ${kindClass(item.kind)}`} aria-hidden />
            <div className="dashboard-activity-text">
              <div className="dashboard-activity-row">
                <strong>{item.title}</strong>
                <time dateTime={item.at}>{formatRelative(item.at)}</time>
              </div>
              <span className="dashboard-activity-sub">{item.subtitle}</span>
            </div>
          </>
        )
        return (
          <li key={item.id} className="dashboard-activity-item">
            {item.href ? (
              <Link to={item.href} className="dashboard-activity-link">
                {inner}
              </Link>
            ) : (
              <div className="dashboard-activity-static">{inner}</div>
            )}
          </li>
        )
      })}
    </ul>
  )
}
