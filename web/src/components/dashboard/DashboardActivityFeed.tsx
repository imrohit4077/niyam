import type { ActivityItem } from './dashboardActivityFeed'

const kindClass: Record<ActivityItem['kind'], string> = {
  application: 'dashboard-activity-dot--blue',
  interview: 'dashboard-activity-dot--violet',
  hire: 'dashboard-activity-dot--green',
  offer: 'dashboard-activity-dot--amber',
}

type Props = {
  items: ActivityItem[]
  loading?: boolean
}

export function DashboardActivityFeed({ items, loading }: Props) {
  if (loading) {
    return (
      <ul className="dashboard-activity-list" aria-busy>
        {Array.from({ length: 6 }).map((_, i) => (
          <li key={i} className="dashboard-activity-item">
            <div className="dashboard-skeleton-dot" />
            <div className="dashboard-activity-body">
              <div className="dashboard-skeleton-line" style={{ width: '40%' }} />
              <div className="dashboard-skeleton-line dashboard-skeleton-line--short" style={{ width: '72%', marginTop: 8 }} />
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
          <span className={`dashboard-activity-dot ${kindClass[item.kind]}`} aria-hidden />
          <div className="dashboard-activity-body">
            <div className="dashboard-activity-head">
              <strong>{item.title}</strong>
              <time dateTime={item.at}>{item.timeLabel}</time>
            </div>
            <p className="dashboard-activity-sub">{item.subtitle}</p>
          </div>
        </li>
      ))}
    </ul>
  )
}
