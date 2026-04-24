export function DashboardKpiSkeleton() {
  return (
    <div className="dashboard-kpi-skeleton-grid" aria-busy="true" aria-label="Loading summary">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="dashboard-kpi-skeleton-card">
          <div className="dashboard-skeleton-line dashboard-skeleton-line--short" />
          <div className="dashboard-skeleton-line dashboard-skeleton-line--value" />
          <div className="dashboard-skeleton-line dashboard-skeleton-line--tiny" />
        </div>
      ))}
    </div>
  )
}

export function DashboardPanelSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="dashboard-panel-skeleton" aria-busy="true">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="dashboard-skeleton-row">
          <div className="dashboard-skeleton-line dashboard-skeleton-line--medium" />
          <div className="dashboard-skeleton-line dashboard-skeleton-line--short" />
        </div>
      ))}
    </div>
  )
}
