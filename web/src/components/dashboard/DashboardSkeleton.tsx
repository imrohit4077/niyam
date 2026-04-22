export function DashboardKpiSkeleton() {
  return (
    <div className="dashboard-kpi-grid dashboard-kpi-grid-skeleton" aria-busy="true" aria-label="Loading summary">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="dashboard-kpi-card dashboard-skeleton-card">
          <div className="dashboard-skeleton dashboard-skeleton-icon" />
          <div className="dashboard-skeleton dashboard-skeleton-line sm" />
          <div className="dashboard-skeleton dashboard-skeleton-line lg" />
          <div className="dashboard-skeleton dashboard-skeleton-line md" />
        </div>
      ))}
    </div>
  )
}

export function DashboardPanelSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="dashboard-panel-skeleton" aria-busy="true">
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className={`dashboard-skeleton dashboard-skeleton-line ${i === 0 ? 'lg' : 'md'}`} />
      ))}
    </div>
  )
}
