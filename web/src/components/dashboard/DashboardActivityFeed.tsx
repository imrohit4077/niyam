import { formatDashboardLabel, formatRelativeShort } from './dashboardHelpers'

export type ActivityFeedItem = {
  id: string
  at: string
  title: string
  meta?: string
}

export function DashboardActivityFeed({ items }: { items: ActivityFeedItem[] }) {
  if (items.length === 0) {
    return <div className="dashboard-empty">No recent activity yet.</div>
  }

  return (
    <ul className="dashboard-activity-list" aria-label="Recent activity">
      {items.map(item => (
        <li key={item.id} className="dashboard-activity-item">
          <div className="dashboard-activity-dot" aria-hidden />
          <div className="dashboard-activity-body">
            <p className="dashboard-activity-title">{formatDashboardLabel(item.title)}</p>
            {item.meta ? <p className="dashboard-activity-meta">{item.meta}</p> : null}
          </div>
          <time className="dashboard-activity-time" dateTime={item.at}>
            {formatRelativeShort(item.at)}
          </time>
        </li>
      ))}
    </ul>
  )
}
