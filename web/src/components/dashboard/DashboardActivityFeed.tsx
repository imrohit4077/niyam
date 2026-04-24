export type DashboardActivityItem = {
  id: string
  title: string
  subtitle: string
  at: string
}

function formatActivityWhen(iso: string) {
  const d = new Date(iso)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const mins = Math.floor(diffMs / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}d ago`
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function DashboardActivityFeed({ items }: { items: DashboardActivityItem[] }) {
  if (items.length === 0) {
    return <div className="dashboard-empty dashboard-empty--compact">No recent activity yet.</div>
  }

  return (
    <ul className="dashboard-activity-feed" aria-label="Recent activity">
      {items.map(item => (
        <li key={item.id} className="dashboard-activity-feed-item">
          <div className="dashboard-activity-feed-dot" aria-hidden />
          <div className="dashboard-activity-feed-body">
            <strong>{item.title}</strong>
            <span className="dashboard-activity-feed-sub">{item.subtitle}</span>
          </div>
          <time className="dashboard-activity-feed-time" dateTime={item.at}>
            {formatActivityWhen(item.at)}
          </time>
        </li>
      ))}
    </ul>
  )
}
