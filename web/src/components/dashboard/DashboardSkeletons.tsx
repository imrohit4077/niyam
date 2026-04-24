export function DashboardKpiSkeletonRow() {
  return (
    <div className="dashboard-summary-skeleton-row" aria-hidden>
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="dashboard-summary-skeleton-card" />
      ))}
    </div>
  )
}

export function DashboardChartSkeleton({ short }: { short?: boolean }) {
  return (
    <div className={`dashboard-chart-skeleton${short ? ' dashboard-chart-skeleton--short' : ''}`} aria-hidden />
  )
}

export function DashboardTableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="dashboard-table-skeleton" aria-hidden>
      <div className="dashboard-table-skeleton__header" />
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="dashboard-table-skeleton__row" />
      ))}
    </div>
  )
}

export function DashboardFeedSkeleton({ items = 6 }: { items?: number }) {
  return (
    <div className="dashboard-feed-skeleton" aria-hidden>
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="dashboard-feed-skeleton__item" />
      ))}
    </div>
  )
}
