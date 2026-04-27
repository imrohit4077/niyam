import { Link } from 'react-router-dom'
import type { ActivityItem } from './dashboardActivityUtils'

function toneClass(tone: ActivityItem['tone']) {
  switch (tone) {
    case 'apply':
      return 'dashboard-activity-dot--apply'
    case 'interview':
      return 'dashboard-activity-dot--interview'
    case 'offer':
      return 'dashboard-activity-dot--offer'
    case 'hire':
      return 'dashboard-activity-dot--hire'
    default:
      return 'dashboard-activity-dot--other'
  }
}

function formatWhen(ts: number) {
  const d = new Date(ts)
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

export function DashboardActivityFeed({ items }: { items: ActivityItem[] }) {
  if (items.length === 0) {
    return <div className="dashboard-empty dashboard-empty--compact">No recent activity yet.</div>
  }

  return (
    <ul className="dashboard-activity-list">
      {items.map(item => (
        <li key={item.id} className="dashboard-activity-item">
          <span className={`dashboard-activity-dot ${toneClass(item.tone)}`} aria-hidden />
          <div className="dashboard-activity-body">
            <div className="dashboard-activity-title-row">
              {item.href ? (
                <Link to={item.href} className="dashboard-activity-title">
                  {item.title}
                </Link>
              ) : (
                <span className="dashboard-activity-title">{item.title}</span>
              )}
              <time className="dashboard-activity-when" dateTime={new Date(item.at).toISOString()}>
                {formatWhen(item.at)}
              </time>
            </div>
            <p className="dashboard-activity-subtitle">{item.subtitle}</p>
          </div>
        </li>
      ))}
    </ul>
  )
}
