export function DashboardKpiSkeleton() {
  return (
    <div className="dashboard-summary-skeleton-grid" aria-busy="true" aria-label="Loading summary">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="dashboard-skeleton dashboard-skeleton--card">
          <div className="dashboard-skeleton-line dashboard-skeleton-line--short" />
          <div className="dashboard-skeleton-line dashboard-skeleton-line--value" />
          <div className="dashboard-skeleton-line dashboard-skeleton-line--medium" />
        </div>
      ))}
    </div>
  )
}

export function DashboardPanelSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="dashboard-skeleton-stack" aria-busy="true">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="dashboard-skeleton dashboard-skeleton--row">
          <div className="dashboard-skeleton-line dashboard-skeleton-line--long" />
          <div className="dashboard-skeleton-line dashboard-skeleton-line--short" />
        </div>
      ))}
    </div>
  )
}
