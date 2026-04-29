export function DashboardKpiSkeleton() {
  return (
    <div className="dashboard-kpi-skeleton-grid" aria-hidden>
      {Array.from({ length: 4 }, (_, i) => (
        <div key={i} className="dashboard-kpi-skeleton-card">
          <div className="dashboard-skeleton dashboard-skeleton--circle" />
          <div className="dashboard-skeleton dashboard-skeleton--line-sm" />
          <div className="dashboard-skeleton dashboard-skeleton--line-lg" />
          <div className="dashboard-skeleton dashboard-skeleton--line-md" />
        </div>
      ))}
    </div>
  )
}

export function DashboardPanelSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="dashboard-panel-skeleton" aria-hidden>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="dashboard-skeleton dashboard-skeleton--line-full" />
      ))}
    </div>
  )
}
