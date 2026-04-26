export function DashboardKpiSkeletonRow() {
  return (
    <div className="dashboard-kpi-skeleton-row" aria-hidden>
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="dashboard-kpi-skeleton-card" />
      ))}
    </div>
  )
}

export function DashboardPanelBodySkeleton({ lines = 4 }: { lines?: number }) {
  return (
    <div className="dashboard-panel-skeleton" aria-busy aria-label="Loading">
      <div className="dashboard-panel-skeleton-chart" />
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="dashboard-panel-skeleton-line" style={{ width: `${78 - i * 8}%` }} />
      ))}
    </div>
  )
}
