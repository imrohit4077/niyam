import { Link } from 'react-router-dom'
import type { ActivityItem } from './dashboardActivityUtils'

function formatTime(value: string) {
  return new Date(value).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function kindClass(kind: ActivityItem['kind']) {
  switch (kind) {
    case 'interview':
      return 'dashboard-activity-dot-blue'
    case 'offer':
      return 'dashboard-activity-dot-violet'
    case 'hire':
      return 'dashboard-activity-dot-green'
    default:
      return 'dashboard-activity-dot-slate'
  }
}

export function DashboardActivityFeed({
  items,
  accountId,
  emptyLabel = 'No recent activity yet.',
}: {
  items: ActivityItem[]
  accountId: string
  emptyLabel?: string
}) {
  if (items.length === 0) {
    return <div className="dashboard-empty">{emptyLabel}</div>
  }

  return (
    <ul className="dashboard-activity-list">
      {items.map(item => (
        <li key={item.id} className="dashboard-activity-item">
          <span className={`dashboard-activity-dot ${kindClass(item.kind)}`} aria-hidden />
          <div className="dashboard-activity-body">
            <div className="dashboard-activity-title-row">
              <span className="dashboard-activity-title">{item.title}</span>
              <time className="dashboard-activity-time" dateTime={item.at}>
                {formatTime(item.at)}
              </time>
            </div>
            <span className="dashboard-activity-sub">{item.subtitle}</span>
          </div>
        </li>
      ))}
      <li className="dashboard-activity-footer">
        <Link className="dashboard-link" to={`/account/${accountId}/job-applications`}>
          View all applications
        </Link>
      </li>
    </ul>
  )
}
