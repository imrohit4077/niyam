import { Link } from 'react-router-dom'
import type { ActivityItem } from './dashboardActivityFeed'

function formatRelativeTime(iso: string) {
  const t = new Date(iso).getTime()
  if (Number.isNaN(t)) return ''
  const diff = Date.now() - t
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}d ago`
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export type { ActivityItem } from './dashboardActivityFeed'

export function DashboardActivityFeed({ items, loading }: { items: ActivityItem[]; loading?: boolean }) {
  if (loading) {
    return (
      <ul className="dashboard-activity-list" aria-busy>
        {Array.from({ length: 6 }).map((_, i) => (
          <li key={i} className="dashboard-activity-item dashboard-activity-skeleton">
            <span className="dashboard-activity-skeleton-dot" />
            <div className="dashboard-activity-body">
              <span className="dashboard-summary-skeleton-line dashboard-summary-skeleton-line-short" />
              <span className="dashboard-summary-skeleton-line" style={{ width: '72%' }} />
            </div>
          </li>
        ))}
      </ul>
    )
  }

  if (items.length === 0) {
    return <div className="dashboard-empty">No recent activity yet.</div>
  }

  return (
    <ul className="dashboard-activity-list">
      {items.map(item => (
        <li key={item.id} className="dashboard-activity-item">
          <span className="dashboard-activity-dot" aria-hidden />
          <div className="dashboard-activity-body">
            <div className="dashboard-activity-row">
              <span className="dashboard-activity-title">{item.title}</span>
              <time className="dashboard-activity-time" dateTime={item.at}>
                {formatRelativeTime(item.at)}
              </time>
            </div>
            {item.href ? (
              <Link to={item.href} className="dashboard-activity-detail dashboard-activity-link">
                {item.detail}
              </Link>
            ) : (
              <span className="dashboard-activity-detail">{item.detail}</span>
            )}
          </div>
        </li>
      ))}
    </ul>
  )
}
