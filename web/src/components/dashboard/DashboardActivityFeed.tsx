import { Link } from 'react-router-dom'

export type ActivityFeedItem = {
  id: string
  at: string
  title: string
  detail: string
  href?: string
}

function formatRelative(at: string) {
  const t = new Date(at).getTime()
  const diff = Date.now() - t
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 48) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 14) return `${days}d ago`
  return new Date(at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function DashboardActivityFeed({
  items,
  accountId,
  emptyLabel,
}: {
  items: ActivityFeedItem[]
  accountId: string
  emptyLabel: string
}) {
  if (items.length === 0) {
    return <div className="dashboard-empty">{emptyLabel}</div>
  }

  return (
    <div className="dashboard-activity-stack">
      <ul className="dashboard-activity-list">
        {items.map(item => (
          <li key={item.id} className="dashboard-activity-item">
            <div className="dashboard-activity-dot" aria-hidden />
            <div className="dashboard-activity-body">
              <div className="dashboard-activity-title-row">
                {item.href ? (
                  <Link className="dashboard-activity-title" to={item.href}>
                    {item.title}
                  </Link>
                ) : (
                  <span className="dashboard-activity-title">{item.title}</span>
                )}
                <time className="dashboard-activity-time" dateTime={item.at}>
                  {formatRelative(item.at)}
                </time>
              </div>
              <p className="dashboard-activity-detail">{item.detail}</p>
            </div>
          </li>
        ))}
      </ul>
      <div className="dashboard-activity-footer">
        <Link className="dashboard-link" to={`/account/${accountId}/jobs`}>
          View all jobs
        </Link>
      </div>
    </div>
  )
}
