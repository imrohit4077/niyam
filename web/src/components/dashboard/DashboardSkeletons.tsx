export function DashboardKpiSkeletonGrid() {
  return (
    <div className="dashboard-kpi-grid" aria-busy="true" aria-label="Loading summary">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="dashboard-kpi-card dashboard-kpi-skeleton">
          <div className="dashboard-skeleton dashboard-skeleton-icon" />
          <div className="dashboard-skeleton dashboard-skeleton-line sm" />
          <div className="dashboard-skeleton dashboard-skeleton-line lg" />
          <div className="dashboard-skeleton dashboard-skeleton-line md" />
        </div>
      ))}
    </div>
  )
}

export function DashboardPanelSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="dashboard-panel-skeleton" aria-busy="true">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="dashboard-skeleton dashboard-skeleton-row" />
      ))}
    </div>
  )
}

export function DashboardChartSkeleton({ short }: { short?: boolean }) {
  return (
    <div className={`dashboard-chart-shell${short ? ' dashboard-chart-shell-short' : ''} dashboard-chart-skeleton-wrap`} aria-busy="true">
      <div className="dashboard-skeleton dashboard-skeleton-chart" />
    </div>
  )
}
