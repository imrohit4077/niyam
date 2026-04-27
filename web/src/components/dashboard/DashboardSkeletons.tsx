export function DashboardKpiSkeletonGrid() {
  return (
    <div className="dashboard-kpi-grid dashboard-kpi-grid--summary" aria-hidden>
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="dashboard-skeleton-card">
          <div className="dashboard-skeleton dashboard-skeleton--icon" />
          <div className="dashboard-skeleton dashboard-skeleton--label" />
          <div className="dashboard-skeleton dashboard-skeleton--value" />
          <div className="dashboard-skeleton dashboard-skeleton--trend" />
        </div>
      ))}
    </div>
  )
}

export function DashboardPanelSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="dashboard-panel-skeleton" aria-hidden>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="dashboard-skeleton dashboard-skeleton--row" />
      ))}
    </div>
  )
}

export function DashboardChartSkeleton({ short }: { short?: boolean }) {
  return (
    <div className={`dashboard-chart-shell${short ? ' dashboard-chart-shell-short' : ''}`} aria-hidden>
      <div className="dashboard-skeleton dashboard-skeleton--chart" />
    </div>
  )
}
