import type { ActivityItem } from './dashboardMetrics'

type Props = {
  items: ActivityItem[]
  loading?: boolean
}

function FeedSkeleton() {
  return (
    <ul className="dashboard-activity-list" aria-hidden>
      {Array.from({ length: 6 }, (_, i) => (
        <li key={i} className="dashboard-activity-item dashboard-activity-item--skeleton">
          <span className="dashboard-kpi-skel dashboard-kpi-skel--line" />
          <span className="dashboard-kpi-skel dashboard-kpi-skel--meta" />
        </li>
      ))}
    </ul>
  )
}

export function DashboardActivityFeed({ items, loading }: Props) {
  if (loading) {
    return <FeedSkeleton />
  }
  if (items.length === 0) {
    return <div className="dashboard-empty">No recent activity yet.</div>
  }
  return (
    <ul className="dashboard-activity-list">
      {items.map(item => (
        <li
          key={item.id}
          className={`dashboard-activity-item dashboard-activity-item--${item.tone}`}
        >
          <div className="dashboard-activity-item-main">
            <span className="dashboard-activity-title">{item.title}</span>
            <span className="dashboard-activity-sub">{item.subtitle}</span>
          </div>
          <time className="dashboard-activity-meta" dateTime={new Date(item.at).toISOString()}>
            {item.metaLabel}
          </time>
        </li>
      ))}
    </ul>
  )
}
