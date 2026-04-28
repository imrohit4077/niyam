import { formatRelativeTime } from './dashboardUtils'

export type ActivityFeedItem = {
  id: string
  kind: 'application' | 'interview' | 'hire' | 'offer'
  title: string
  /** Shown as secondary line (e.g. job title) */
  meta: string
  at: string
}

export function DashboardActivityFeed({ items, loading }: { items: ActivityFeedItem[]; loading?: boolean }) {
  if (loading) {
    return (
      <ul className="dashboard-activity-list" aria-busy="true">
        {Array.from({ length: 6 }, (_, i) => (
          <li key={i} className="dashboard-activity-item dashboard-activity-skeleton">
            <div className="dashboard-activity-skel-dot" />
            <div className="dashboard-activity-skel-body">
              <div className="dashboard-activity-skel-line wide" />
              <div className="dashboard-activity-skel-line narrow" />
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
          <span className={`dashboard-activity-dot dashboard-activity-dot-${item.kind}`} />
          <div className="dashboard-activity-body">
            <div className="dashboard-activity-title-row">
              <strong className="dashboard-activity-title">{item.title}</strong>
              <time className="dashboard-activity-time" dateTime={item.at}>
                {formatRelativeTime(item.at)}
              </time>
            </div>
            <span className="dashboard-activity-meta">{item.meta}</span>
          </div>
        </li>
      ))}
    </ul>
  )
}
