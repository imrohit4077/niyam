export function DashboardPanelSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="dashboard-skeleton-panel" aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="dashboard-skeleton-line" />
      ))}
    </div>
  )
}

export function DashboardKpiGridSkeleton() {
  return (
    <div className="dashboard-kpi-grid dashboard-kpi-grid--skeleton" aria-busy="true" aria-label="Loading metrics">
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="dashboard-kpi-card dashboard-kpi-card--skeleton">
          <div className="dashboard-skeleton-block dashboard-skeleton-block--sm" />
          <div className="dashboard-skeleton-block dashboard-skeleton-block--lg" />
          <div className="dashboard-skeleton-block dashboard-skeleton-block--md" />
        </div>
      ))}
    </div>
  )
}
