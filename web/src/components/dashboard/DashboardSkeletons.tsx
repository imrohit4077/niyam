export function DashboardKpiSkeletonGrid() {
  return (
    <div className="dashboard-kpi-grid dashboard-kpi-grid-4" aria-busy="true" aria-label="Loading summary">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="dashboard-skeleton dashboard-skeleton-kpi" />
      ))}
    </div>
  )
}

export function DashboardPanelSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="dashboard-skeleton-stack" aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="dashboard-skeleton dashboard-skeleton-row" />
      ))}
    </div>
  )
}

export function DashboardChartSkeleton({ short }: { short?: boolean }) {
  return (
    <div
      className={`dashboard-skeleton dashboard-skeleton-chart ${short ? 'dashboard-skeleton-chart-short' : ''}`}
      aria-busy="true"
      aria-label="Loading chart"
    />
  )
}
