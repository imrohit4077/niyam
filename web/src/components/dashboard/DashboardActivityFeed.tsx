import type { DashboardActivityItem } from './dashboardTypes'

function kindLabel(kind: DashboardActivityItem['kind']) {
  switch (kind) {
    case 'application':
      return 'Application'
    case 'interview':
      return 'Interview'
    case 'offer':
      return 'Offer'
    case 'hire':
      return 'Hire'
    default:
      return 'Activity'
  }
}

export function DashboardActivityFeed({ items }: { items: DashboardActivityItem[] }) {
  if (items.length === 0) {
    return <div className="dashboard-empty">No recent activity yet.</div>
  }

  return (
    <ul className="dashboard-activity-list">
      {items.map(item => (
        <li key={item.id} className="dashboard-activity-item">
          <span className={`dashboard-activity-badge dashboard-activity-badge--${item.kind}`}>{kindLabel(item.kind)}</span>
          <div className="dashboard-activity-body">
            <strong>{item.title}</strong>
            <span>{item.subtitle}</span>
          </div>
          <time className="dashboard-activity-time" dateTime={item.at}>
            {new Date(item.at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
          </time>
        </li>
      ))}
    </ul>
  )
}
