export function DashboardKpiSkeleton() {
  return (
    <div className="dashboard-kpi-grid dashboard-kpi-grid--skeleton" aria-busy="true" aria-label="Loading summary">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="dashboard-kpi-skeleton-card">
          <div className="dashboard-skeleton dashboard-skeleton--icon" />
          <div className="dashboard-skeleton dashboard-skeleton--label" />
          <div className="dashboard-skeleton dashboard-skeleton--value" />
          <div className="dashboard-skeleton dashboard-skeleton--sub" />
        </div>
      ))}
    </div>
  )
}

export function DashboardPanelSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="dashboard-panel-skeleton" aria-busy="true">
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="dashboard-skeleton dashboard-skeleton--row" />
      ))}
    </div>
  )
}
