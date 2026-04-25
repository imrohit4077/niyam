export function DashboardKpiSkeletonGrid() {
  return (
    <div className="dashboard-kpi-grid" aria-busy="true" aria-label="Loading summary">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="dashboard-kpi-card dashboard-kpi-skeleton-card">
          <div className="dashboard-kpi-card-top">
            <div className="dashboard-skeleton dashboard-skeleton-icon" />
            <div className="dashboard-skeleton dashboard-skeleton-trend" />
          </div>
          <div className="dashboard-skeleton dashboard-skeleton-label" />
          <div className="dashboard-skeleton dashboard-skeleton-value" />
        </div>
      ))}
    </div>
  )
}

export function DashboardChartSkeleton({ short }: { short?: boolean }) {
  return (
    <div
      className={`dashboard-chart-shell${short ? ' dashboard-chart-shell-short' : ''} dashboard-chart-skeleton-wrap`}
      aria-busy="true"
      aria-label="Loading chart"
    >
      <div className="dashboard-skeleton dashboard-skeleton-chart" />
    </div>
  )
}

export function DashboardPanelSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="dashboard-feed-skeleton" aria-busy="true">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="dashboard-skeleton dashboard-skeleton-feed-row" />
      ))}
    </div>
  )
}
