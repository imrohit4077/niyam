export function DashboardPanelSkeleton({ lines = 4 }: { lines?: number }) {
  return (
    <div className="dashboard-skeleton" aria-busy="true" aria-label="Loading">
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="dashboard-skeleton-line" style={{ width: i === 0 ? '55%' : `${70 - i * 8}%` }} />
      ))}
    </div>
  )
}

export function DashboardChartSkeleton({ height = 220 }: { height?: number }) {
  return (
    <div
      className="dashboard-skeleton dashboard-skeleton-chart"
      style={{ height }}
      aria-busy="true"
      aria-label="Loading chart"
    />
  )
}
