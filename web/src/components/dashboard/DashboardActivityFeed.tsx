import { Link } from 'react-router-dom'
import type { ActivityItem } from './dashboardUtils'

export function DashboardActivityFeed({ items }: { items: ActivityItem[] }) {
  if (items.length === 0) {
    return <div className="dashboard-empty">No recent activity yet.</div>
  }

  return (
    <ul className="dashboard-activity-feed">
      {items.map(item => (
        <li key={item.id} className="dashboard-activity-feed-item">
          <Link to={item.href} className="dashboard-activity-feed-link">
            <span className="dashboard-activity-feed-title">{item.title}</span>
            <span className="dashboard-activity-feed-meta">{item.meta}</span>
          </Link>
        </li>
      ))}
    </ul>
  )
}
