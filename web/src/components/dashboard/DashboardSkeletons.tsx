export function DashboardKpiSkeletonGrid() {
  return (
    <div className="dashboard-kpi-grid dashboard-kpi-grid--skeleton" aria-hidden>
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="dashboard-skeleton dashboard-skeleton-kpi" />
      ))}
    </div>
  )
}

export function DashboardPanelChartSkeleton({ short }: { short?: boolean }) {
  return (
    <div
      className={`dashboard-chart-shell dashboard-skeleton dashboard-skeleton-chart ${short ? 'dashboard-chart-shell-short' : ''}`}
      aria-hidden
    />
  )
}

export function DashboardTableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="dashboard-table-skeleton" aria-hidden>
      <div className="dashboard-table-skeleton-row dashboard-table-skeleton-row--head" />
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="dashboard-table-skeleton-row" />
      ))}
    </div>
  )
}

export function DashboardFeedSkeleton() {
  return (
    <div className="dashboard-feed-skeleton" aria-hidden>
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="dashboard-feed-skeleton-line" />
      ))}
    </div>
  )
}
