import type { ActivityItem } from './dashboardUtils'

type Props = {
  items: ActivityItem[]
  emptyMessage?: string
}

export function DashboardActivityFeed({ items, emptyMessage = 'No recent activity yet.' }: Props) {
  if (items.length === 0) {
    return <div className="dashboard-empty dashboard-activity-empty">{emptyMessage}</div>
  }

  return (
    <ul className="dashboard-activity-list" aria-label="Recent activity">
      {items.map(item => (
        <li key={item.id} className="dashboard-activity-item">
          <div className="dashboard-activity-dot" aria-hidden />
          <div className="dashboard-activity-body">
            <div className="dashboard-activity-title">{item.title}</div>
            <div className="dashboard-activity-meta">{item.meta}</div>
          </div>
          <span className="dashboard-activity-time">{item.timeLabel}</span>
        </li>
      ))}
    </ul>
  )
}
