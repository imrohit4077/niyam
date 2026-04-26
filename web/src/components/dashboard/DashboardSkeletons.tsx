export function DashboardKpiSkeletonGrid() {
  return (
    <div className="dashboard-kpi-grid dashboard-kpi-skeleton-grid" aria-busy aria-label="Loading summary">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="dashboard-skeleton dashboard-skeleton-kpi" />
      ))}
    </div>
  )
}

export function DashboardChartSkeleton({ short }: { short?: boolean }) {
  return (
    <div
      className={`dashboard-skeleton dashboard-skeleton-chart ${short ? 'dashboard-skeleton-chart-short' : ''}`}
      aria-busy
      aria-label="Loading chart"
    />
  )
}

export function DashboardTableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="dashboard-table-skeleton" aria-busy aria-label="Loading table">
      <div className="dashboard-skeleton dashboard-skeleton-table-head" />
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="dashboard-skeleton dashboard-skeleton-table-row" />
      ))}
    </div>
  )
}

export function DashboardFeedSkeleton({ items = 5 }: { items?: number }) {
  return (
    <div className="dashboard-feed-skeleton" aria-busy aria-label="Loading activity">
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="dashboard-skeleton dashboard-skeleton-feed-row" />
      ))}
    </div>
  )
}
