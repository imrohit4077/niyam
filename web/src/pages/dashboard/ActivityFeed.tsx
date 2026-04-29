import { Link } from 'react-router-dom'
import type { ActivityItem } from './dashboardUtils'
import { formatRelativeTime } from './dashboardUtils'

const KIND_ICON: Record<ActivityItem['kind'], string> = {
  application: '◆',
  interview: '◇',
  stage: '→',
  job: '▣',
}

type Props = {
  items: ActivityItem[]
  loading?: boolean
}

export function ActivityFeed({ items, loading }: Props) {
  if (loading) {
    return (
      <div className="dashboard-activity-skeleton" aria-busy>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="dashboard-activity-skeleton-row">
            <span className="dashboard-skeleton-dot" />
            <div className="dashboard-activity-skeleton-text">
              <span className="dashboard-skeleton-line dashboard-skeleton-line--md" />
              <span className="dashboard-skeleton-line dashboard-skeleton-line--sm" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (items.length === 0) {
    return <div className="dashboard-empty">No recent activity yet.</div>
  }

  return (
    <ul className="dashboard-activity-list">
      {items.slice(0, 12).map(item => (
        <li key={item.id} className="dashboard-activity-item">
          <span className="dashboard-activity-kind" title={item.kind}>
            {KIND_ICON[item.kind]}
          </span>
          <div className="dashboard-activity-body">
            {item.href ? (
              <Link to={item.href} className="dashboard-activity-title">
                {item.title}
              </Link>
            ) : (
              <span className="dashboard-activity-title">{item.title}</span>
            )}
            <span className="dashboard-activity-sub">{item.subtitle}</span>
          </div>
          <time className="dashboard-activity-time" dateTime={item.at}>
            {formatRelativeTime(item.at)}
          </time>
        </li>
      ))}
    </ul>
  )
}
