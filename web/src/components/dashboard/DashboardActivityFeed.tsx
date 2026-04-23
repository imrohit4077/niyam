import { Link } from 'react-router-dom'

export type ActivityFeedItem = {
  id: string
  at: string
  title: string
  subtitle: string
  tone: 'default' | 'success' | 'accent'
}

type Props = {
  items: ActivityFeedItem[]
  accountId: string
  loading?: boolean
}

function toneClass(tone: ActivityFeedItem['tone']) {
  if (tone === 'success') return 'dashboard-activity-item--success'
  if (tone === 'accent') return 'dashboard-activity-item--accent'
  return ''
}

export default function DashboardActivityFeed({ items, accountId, loading }: Props) {
  if (loading) {
    return (
      <div className="dashboard-activity-list" role="status" aria-label="Loading activity">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="dashboard-activity-item dashboard-activity-item--skeleton">
            <span className="dashboard-activity-skeleton-line dashboard-activity-skeleton-line--wide" />
            <span className="dashboard-activity-skeleton-line" />
          </div>
        ))}
      </div>
    )
  }

  if (items.length === 0) {
    return <div className="dashboard-empty">No recent activity yet. Applications and interviews will show up here.</div>
  }

  return (
    <div className="dashboard-activity-list">
      {items.map(item => (
        <div key={item.id} className={`dashboard-activity-item ${toneClass(item.tone)}`}>
          <div className="dashboard-activity-dot" aria-hidden />
          <div className="dashboard-activity-body">
            <strong>{item.title}</strong>
            <span>{item.subtitle}</span>
          </div>
          <time className="dashboard-activity-time" dateTime={item.at}>
            {new Date(item.at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
          </time>
        </div>
      ))}
      <div className="dashboard-panel-footer">
        <Link className="dashboard-link" to={`/account/${accountId}/jobs`}>
          View all jobs
        </Link>
      </div>
    </div>
  )
}
