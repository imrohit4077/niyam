import { Link } from 'react-router-dom'
import type { ActivityFeedItem } from './dashboardActivityUtils'

type Props = {
  items: ActivityFeedItem[]
  accountId: string
  loading?: boolean
}

function formatFeedTime(iso: string) {
  const d = new Date(iso)
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

function activityIcon(kind: ActivityFeedItem['kind']) {
  if (kind === 'interview') {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <path d="M16 2v4M8 2v4M3 10h18" />
      </svg>
    )
  }
  if (kind === 'job') {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z" />
        <path d="M6 12h12" />
      </svg>
    )
  }
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  )
}

export default function DashboardActivityFeed({ items, accountId, loading }: Props) {
  if (loading) {
    return (
      <ul className="dashboard-activity-list" aria-busy="true">
        {Array.from({ length: 6 }).map((_, i) => (
          <li key={i} className="dashboard-activity-item dashboard-activity-item--skeleton">
            <span className="dashboard-activity-skel-icon" />
            <div className="dashboard-activity-skel-lines">
              <span className="dashboard-activity-skel-line dashboard-activity-skel-line--long" />
              <span className="dashboard-activity-skel-line dashboard-activity-skel-line--short" />
            </div>
          </li>
        ))}
      </ul>
    )
  }

  if (items.length === 0) {
    return <div className="dashboard-empty">No recent activity yet. Applications and interviews will appear here.</div>
  }

  return (
    <ul className="dashboard-activity-list">
      {items.map(item => (
        <li key={item.id} className="dashboard-activity-item">
          <span className="dashboard-activity-icon">{activityIcon(item.kind)}</span>
          <div className="dashboard-activity-body">
            <div className="dashboard-activity-title-row">
              <strong>{item.title}</strong>
              <time dateTime={item.at}>{formatFeedTime(item.at)}</time>
            </div>
            <span className="dashboard-activity-detail">{item.detail}</span>
          </div>
        </li>
      ))}
      <li className="dashboard-activity-footer">
        <Link className="dashboard-link dashboard-link--quiet" to={`/account/${accountId}/jobs`}>
          View all jobs
        </Link>
      </li>
    </ul>
  )
}
