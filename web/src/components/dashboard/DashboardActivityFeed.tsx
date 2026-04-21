import { Link } from 'react-router-dom'
import type { DashboardActivityItem } from './buildDashboardActivity'

function ActivityIcon({ kind }: { kind: DashboardActivityItem['kind'] }) {
  const common = { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.75 }
  switch (kind) {
    case 'apply':
      return (
        <svg {...common} aria-hidden>
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      )
    case 'interview':
      return (
        <svg {...common} aria-hidden>
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <path d="M16 2v4M8 2v4M3 10h18" />
        </svg>
      )
    case 'hire':
      return (
        <svg {...common} aria-hidden>
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
          <path d="M22 4 12 14.01l-3-3" />
        </svg>
      )
    case 'offer':
      return (
        <svg {...common} aria-hidden>
          <path d="M20 7h-9M14 17H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2Z" />
          <path d="M12 22v-6" />
        </svg>
      )
    case 'reject':
      return (
        <svg {...common} aria-hidden>
          <circle cx="12" cy="12" r="10" />
          <path d="m15 9-6 6M9 9l6 6" />
        </svg>
      )
    default:
      return (
        <svg {...common} aria-hidden>
          <path d="M5 12h14M12 5l7 7-7 7" />
        </svg>
      )
  }
}

function formatRelativeTime(iso: string) {
  const t = new Date(iso).getTime()
  const diff = Date.now() - t
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}d ago`
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

type Props = {
  items: DashboardActivityItem[]
  accountId: string | number
  loading?: boolean
}

export function DashboardActivityFeed({ items, accountId, loading }: Props) {
  if (loading) {
    return (
      <ul className="dashboard-activity-list" aria-busy="true">
        {Array.from({ length: 6 }).map((_, i) => (
          <li key={i} className="dashboard-activity-item">
            <span className="dashboard-skeleton dashboard-skeleton--icon-round" />
            <div className="dashboard-activity-copy">
              <span className="dashboard-skeleton dashboard-skeleton--line" />
              <span className="dashboard-skeleton dashboard-skeleton--line-sm" />
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
          <span className={`dashboard-activity-icon dashboard-activity-icon--${item.kind}`}>
            <ActivityIcon kind={item.kind} />
          </span>
          <div className="dashboard-activity-copy">
            <strong>{item.title}</strong>
            <span>{item.subtitle}</span>
          </div>
          <time className="dashboard-activity-time" dateTime={item.at}>
            {formatRelativeTime(item.at)}
          </time>
        </li>
      ))}
      <li className="dashboard-activity-footer">
        <Link className="dashboard-link dashboard-link--quiet" to={`/account/${accountId}/job-applications`}>
          View all applications
        </Link>
      </li>
    </ul>
  )
}
