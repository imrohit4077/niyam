export function DashboardPanelSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="dashboard-skeleton-panel" aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="dashboard-skeleton-line" />
      ))}
    </div>
  )
}

export function DashboardChartSkeleton({ height = 250 }: { height?: number }) {
  return (
    <div
      className="dashboard-skeleton-chart"
      style={{ height }}
      aria-busy="true"
      aria-label="Loading chart"
    />
  )
}
