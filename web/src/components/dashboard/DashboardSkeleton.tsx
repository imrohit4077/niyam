export function DashboardKpiSkeleton() {
  return (
    <div className="dashboard-summary-skeleton-grid" aria-hidden>
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="dashboard-summary-skeleton-card">
          <div className="dashboard-skeleton dashboard-skeleton--icon" />
          <div className="dashboard-skeleton dashboard-skeleton--line-sm" />
          <div className="dashboard-skeleton dashboard-skeleton--line-lg" />
          <div className="dashboard-skeleton dashboard-skeleton--line-xs" />
        </div>
      ))}
    </div>
  )
}

export function DashboardPanelSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="dashboard-panel-skeleton" aria-hidden>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="dashboard-skeleton dashboard-skeleton--row" />
      ))}
    </div>
  )
}
