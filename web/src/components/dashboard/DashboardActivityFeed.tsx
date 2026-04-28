import { Link } from 'react-router-dom'
import { STAGE_COLORS } from './dashboardConstants'
import type { ActivityItem } from './dashboardActivityModel'

export function DashboardActivityFeed({
  items,
  loading,
  emptyLabel,
  accountId,
}: {
  items: ActivityItem[]
  loading: boolean
  emptyLabel: string
  accountId: string
}) {
  if (loading) {
    return (
      <div className="dashboard-activity-list" role="status" aria-label="Loading activity">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="dashboard-activity-skeleton" />
        ))}
      </div>
    )
  }

  if (items.length === 0) {
    return <div className="dashboard-empty">{emptyLabel}</div>
  }

  return (
    <div className="dashboard-activity-list">
      {items.map(item => {
        const inner = (
          <>
            <div className="dashboard-activity-main">
              <strong>{item.title}</strong>
              <span>{item.subtitle}</span>
            </div>
            <div className="dashboard-activity-meta">
              <span className={`tag ${STAGE_COLORS[item.statusKey] ?? 'tag-blue'}`}>{item.statusLabel}</span>
              <time dateTime={item.sortAt}>{item.meta}</time>
            </div>
          </>
        )
        return item.href ? (
          <Link key={item.id} className="dashboard-activity-row dashboard-activity-row-link" to={item.href}>
            {inner}
          </Link>
        ) : (
          <div key={item.id} className="dashboard-activity-row">
            {inner}
          </div>
        )
      })}
      <div className="dashboard-panel-footer">
        <Link className="dashboard-link" to={`/account/${accountId}/job-applications`}>
          View all applications
        </Link>
      </div>
    </div>
  )
}
