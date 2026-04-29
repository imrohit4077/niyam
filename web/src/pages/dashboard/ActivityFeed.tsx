import { Link } from 'react-router-dom'
import type { Application } from '../../api/applications'
import { formatDashboardLabel, formatRelativeTime } from './dashboardUtils'

function activityCopy(app: Application): string {
  const name = app.candidate_name || app.candidate_email || 'Candidate'
  switch (app.status) {
    case 'applied':
      return `${name} applied`
    case 'screening':
      return `${name} moved to screening`
    case 'interview':
      return `Interview pipeline · ${name}`
    case 'offer':
      return `Offer stage · ${name}`
    case 'hired':
      return `${name} marked hired`
    case 'rejected':
      return `${name} rejected`
    case 'withdrawn':
      return `${name} withdrew`
    default:
      return `${name} · ${formatDashboardLabel(app.status)}`
  }
}

export function ActivityFeed({
  applications,
  accountId,
  emptyLabel,
}: {
  applications: Application[]
  accountId: string
  emptyLabel: string
}) {
  const sorted = [...applications].sort(
    (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
  )
  const rows = sorted.slice(0, 14)

  if (rows.length === 0) {
    return <div className="dashboard-empty">{emptyLabel}</div>
  }

  return (
    <ul className="dashboard-activity-list">
      {rows.map(app => (
        <li key={app.id} className="dashboard-activity-item">
          <div className="dashboard-activity-dot" aria-hidden />
          <div className="dashboard-activity-body">
            <p className="dashboard-activity-title">{activityCopy(app)}</p>
            <div className="dashboard-activity-meta">
              <span className="dashboard-activity-time">{formatRelativeTime(app.updated_at)}</span>
              <Link className="dashboard-activity-link" to={`/account/${accountId}/job-applications/${app.id}`}>
                View
              </Link>
            </div>
          </div>
        </li>
      ))}
    </ul>
  )
}
