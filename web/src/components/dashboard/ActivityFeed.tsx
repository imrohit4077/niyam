import type { ActivityItem } from '../../utils/dashboardMetrics'

function formatActivityWhen(iso: string) {
  try {
    return new Date(iso).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  } catch {
    return ''
  }
}

function kindLabel(kind: ActivityItem['kind']) {
  if (kind === 'application') return 'Application'
  if (kind === 'interview') return 'Interview'
  return 'Job'
}

export function ActivityFeed({ items, loading }: { items: ActivityItem[]; loading?: boolean }) {
  if (loading) {
    return (
      <div className="dashboard-activity-list" aria-busy>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="dashboard-activity-row dashboard-activity-row-skeleton">
            <span className="dashboard-skeleton-line dashboard-skeleton-line-activity-title" />
            <span className="dashboard-skeleton-line dashboard-skeleton-line-activity-meta" />
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
      {items.map(item => (
        <li key={item.id} className="dashboard-activity-row">
          <div className="dashboard-activity-dot" data-kind={item.kind} aria-hidden />
          <div className="dashboard-activity-body">
            <div className="dashboard-activity-title-row">
              <span className="dashboard-activity-label">{item.label}</span>
              <span className="dashboard-activity-kind">{kindLabel(item.kind)}</span>
            </div>
            <p className="dashboard-activity-detail">{item.detail}</p>
            <time className="dashboard-activity-time" dateTime={item.at}>
              {formatActivityWhen(item.at)}
            </time>
          </div>
        </li>
      ))}
    </ul>
  )
}
