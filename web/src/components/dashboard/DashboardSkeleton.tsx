export function DashboardPanelSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="dashboard-skeleton" aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="dashboard-skeleton-row">
          <div className="dashboard-skeleton-line dashboard-skeleton-line--short" />
          <div className="dashboard-skeleton-line" />
        </div>
      ))}
    </div>
  )
}

export function DashboardChartSkeleton({ height = 260 }: { height?: number }) {
  return (
    <div
      className="dashboard-skeleton dashboard-skeleton-chart"
      style={{ height }}
      aria-busy="true"
      aria-label="Loading chart"
    />
  )
}
