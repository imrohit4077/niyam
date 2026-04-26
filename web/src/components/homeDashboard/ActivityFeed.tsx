import type { ActivityItem } from './activityFeedUtils'

function formatWhen(ts: number) {
  return new Date(ts).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function ActivityFeed({ items, loading }: { items: ActivityItem[]; loading?: boolean }) {
  if (loading) {
    return (
      <div className="dashboard-activity dashboard-activity--loading" aria-busy>
        {[0, 1, 2, 3, 4].map(i => (
          <div key={i} className="dashboard-activity-skeleton">
            <span className="dashboard-kpi-skeleton-line dashboard-kpi-skeleton-line--short" />
            <span className="dashboard-kpi-skeleton-line" />
          </div>
        ))}
      </div>
    )
  }

  if (items.length === 0) {
    return <div className="dashboard-empty dashboard-empty--compact">No recent activity yet.</div>
  }

  return (
    <ul className="dashboard-activity">
      {items.map(item => (
        <li key={item.id} className={`dashboard-activity-item dashboard-activity-item--${item.kind}`}>
          <div className="dashboard-activity-dot" aria-hidden />
          <div className="dashboard-activity-body">
            <div className="dashboard-activity-head">
              <span className="dashboard-activity-label">{item.label}</span>
              <time dateTime={new Date(item.at).toISOString()}>{formatWhen(item.at)}</time>
            </div>
            <p className="dashboard-activity-detail">{item.detail}</p>
          </div>
        </li>
      ))}
    </ul>
  )
}
