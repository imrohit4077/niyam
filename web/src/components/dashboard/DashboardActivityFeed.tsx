export type ActivityFeedItem = {
  id: string
  kind: 'application' | 'interview' | 'stage'
  title: string
  meta: string
  at: string
}

function formatRelativeShort(iso: string) {
  const d = new Date(iso)
  const now = Date.now()
  const diff = now - d.getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}d ago`
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function DashboardActivityFeed({ items }: { items: ActivityFeedItem[] }) {
  if (items.length === 0) {
    return <div className="dashboard-empty">No recent activity yet.</div>
  }

  return (
    <ul className="dashboard-activity-feed">
      {items.map(item => (
        <li key={item.id} className="dashboard-activity-item">
          <span className={`dashboard-activity-dot dashboard-activity-dot--${item.kind}`} aria-hidden />
          <div className="dashboard-activity-body">
            <div className="dashboard-activity-title">{item.title}</div>
            <div className="dashboard-activity-meta">{item.meta}</div>
          </div>
          <time className="dashboard-activity-time" dateTime={item.at}>
            {formatRelativeShort(item.at)}
          </time>
        </li>
      ))}
    </ul>
  )
}
