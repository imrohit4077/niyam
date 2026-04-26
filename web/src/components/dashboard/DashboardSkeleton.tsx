export function DashboardKpiSkeleton() {
  return (
    <div className="dashboard-kpi-grid dashboard-kpi-grid-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="dashboard-skeleton-card" aria-hidden>
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
    <div className="dashboard-skeleton-panel" aria-hidden>
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="dashboard-skeleton dashboard-skeleton-block" />
      ))}
    </div>
  )
}
