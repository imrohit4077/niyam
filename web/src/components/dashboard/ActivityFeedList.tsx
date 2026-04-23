import type { ActivityFeedItem } from './dashboardMetrics'

type Props = {
  items: ActivityFeedItem[]
  emptyLabel?: string
}

const KIND_LABEL: Record<ActivityFeedItem['kind'], string> = {
  application: 'App',
  stage: 'Stage',
  interview: 'Int',
}

export function ActivityFeedList({ items, emptyLabel = 'No recent activity.' }: Props) {
  if (items.length === 0) return <div className="dashboard-empty">{emptyLabel}</div>

  return (
    <ul className="dashboard-activity-list">
      {items.map(item => (
        <li key={item.id} className="dashboard-activity-item">
          <span className={`dashboard-activity-badge dashboard-activity-badge-${item.kind}`} title={item.kind}>
            {KIND_LABEL[item.kind]}
          </span>
          <div className="dashboard-activity-body">
            <strong>{item.title}</strong>
            <span>{item.subtitle}</span>
          </div>
          <time className="dashboard-activity-time" dateTime={new Date(item.at).toISOString()}>
            {new Date(item.at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
          </time>
        </li>
      ))}
    </ul>
  )
}
