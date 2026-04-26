export function DashboardPanelSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="dashboard-skeleton" aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="dashboard-skeleton__row">
          <div className="dashboard-skeleton__line dashboard-skeleton__line--short" />
          <div className="dashboard-skeleton__line" />
        </div>
      ))}
    </div>
  )
}

export function DashboardChartSkeleton({ height = 260 }: { height?: number }) {
  return (
    <div
      className="dashboard-skeleton dashboard-skeleton--chart"
      style={{ minHeight: height }}
      aria-busy="true"
      aria-label="Loading chart"
    >
      <div className="dashboard-skeleton__chart-block" />
    </div>
  )
}
