import { Link } from 'react-router-dom'
import type { ActivityItem } from './dashboardMetrics'
import { formatRelativeTime } from './dashboardMetrics'

const KIND_CLASS: Record<ActivityItem['kind'], string> = {
  candidate: 'dashboard-activity-dot--candidate',
  interview: 'dashboard-activity-dot--interview',
  offer: 'dashboard-activity-dot--offer',
  hire: 'dashboard-activity-dot--hire',
  job: 'dashboard-activity-dot--job',
}

export function DashboardActivityFeed({
  items,
  accountId,
  loading,
  nowMs,
}: {
  items: ActivityItem[]
  accountId: string
  loading: boolean
  nowMs: number
}) {
  if (loading) {
    return (
      <div className="dashboard-activity-list" aria-busy="true">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="dashboard-activity-row dashboard-activity-row--skeleton">
            <div className="dashboard-skeleton dashboard-skeleton-dot" />
            <div className="dashboard-activity-skeleton-text">
              <div className="dashboard-skeleton dashboard-skeleton-line" />
              <div className="dashboard-skeleton dashboard-skeleton-line dashboard-skeleton-line--short" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (items.length === 0) {
    return <div className="dashboard-empty">No recent activity yet.</div>
  }

  return (
    <div className="dashboard-activity-list">
      {items.map(item => (
        <div key={item.id} className="dashboard-activity-row">
          <span className={`dashboard-activity-dot ${KIND_CLASS[item.kind]}`} aria-hidden />
          <div className="dashboard-activity-body">
            <strong>{item.title}</strong>
            <span className="dashboard-activity-sub">{item.subtitle}</span>
          </div>
          <time className="dashboard-activity-time" dateTime={item.at}>
            {formatRelativeTime(item.at, nowMs)}
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
