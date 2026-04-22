export function DashboardKpiSkeletonRow() {
  return (
    <div className="dashboard-summary-grid" aria-hidden>
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="dashboard-skeleton-card">
          <div className="dashboard-skeleton dashboard-skeleton-icon" />
          <div className="dashboard-skeleton dashboard-skeleton-line sm" />
          <div className="dashboard-skeleton dashboard-skeleton-line lg" />
          <div className="dashboard-skeleton dashboard-skeleton-line md" />
        </div>
      ))}
    </div>
  )
}

export function DashboardPanelChartSkeleton({ short }: { short?: boolean }) {
  return (
    <div className={`dashboard-chart-shell${short ? ' dashboard-chart-shell-short' : ''}`} aria-hidden>
      <div className="dashboard-skeleton dashboard-skeleton-chart" />
    </div>
  )
}

export function DashboardTableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="dashboard-table-skeleton" aria-hidden>
      <div className="dashboard-skeleton dashboard-skeleton-table-header" />
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="dashboard-skeleton dashboard-skeleton-table-row" />
      ))}
    </div>
  )
}

export function DashboardFeedSkeleton({ items = 6 }: { items?: number }) {
  return (
    <div className="dashboard-feed-skeleton" aria-hidden>
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="dashboard-feed-skeleton-item">
          <div className="dashboard-skeleton dashboard-skeleton-dot" />
          <div className="dashboard-skeleton-block">
            <div className="dashboard-skeleton dashboard-skeleton-line md" />
            <div className="dashboard-skeleton dashboard-skeleton-line sm" />
          </div>
        </div>
      ))}
    </div>
  )
}
