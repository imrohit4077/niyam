export function DashboardKpiSkeletonRow() {
  return (
    <div className="dashboard-kpi-grid dashboard-kpi-grid--skeleton" aria-busy="true" aria-label="Loading summary">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="dashboard-kpi-card dashboard-kpi-skeleton">
          <div className="dashboard-skeleton-line dashboard-skeleton-line--short" />
          <div className="dashboard-skeleton-line dashboard-skeleton-line--value" />
          <div className="dashboard-skeleton-line dashboard-skeleton-line--muted" />
        </div>
      ))}
    </div>
  )
}

export function DashboardPanelSkeleton({ lines = 4 }: { lines?: number }) {
  return (
    <div className="dashboard-panel-skeleton" aria-busy="true">
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="dashboard-skeleton-line"
          style={{ width: `${85 - i * 12}%` }}
        />
      ))}
    </div>
  )
}
