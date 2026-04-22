import type { ActivityItem } from './buildDashboardActivity'

function formatWhen(iso: string) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
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
          <li key={i} className="dashboard-activity-item dashboard-activity-item--skeleton">
            <span className="dashboard-activity-skeleton-line dashboard-activity-skeleton-line--wide" />
            <span className="dashboard-activity-skeleton-line dashboard-activity-skeleton-line--narrow" />
          </li>
        ))}
      </ul>
    )
  }

  if (items.length === 0) {
    return <div className="dashboard-empty dashboard-empty--compact">No recent activity yet.</div>
  }

  return (
    <ul className="dashboard-activity-list">
      {items.map(item => (
        <li key={item.id} className="dashboard-activity-item">
          <span className={`dashboard-activity-dot dashboard-activity-dot--${item.kind}`} aria-hidden />
          <div className="dashboard-activity-body">
            <div className="dashboard-activity-title">{item.title}</div>
            <div className="dashboard-activity-meta">
              <span>{item.meta}</span>
              <time dateTime={item.at}>{formatWhen(item.at)}</time>
            </div>
          </div>
        </li>
      ))}
    </ul>
  )
}
