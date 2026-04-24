export function DashboardChartSkeleton({ short }: { short?: boolean }) {
  return (
    <div className={`dashboard-chart-skeleton${short ? ' dashboard-chart-skeleton-short' : ''}`} aria-hidden>
      <div className="dashboard-chart-skeleton-shimmer" />
    </div>
  )
}

export function DashboardPanelSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="dashboard-panel-skeleton" aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="dashboard-panel-skeleton-row" />
      ))}
    </div>
  )
}
