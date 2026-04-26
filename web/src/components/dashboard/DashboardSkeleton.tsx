export function DashboardPageSkeleton() {
  return (
    <div className="dashboard-skeleton-root" aria-busy="true" aria-label="Loading dashboard">
      <div className="dashboard-skeleton-hero">
        <div className="dashboard-skeleton-line dashboard-skeleton-line--sm" />
        <div className="dashboard-skeleton-line dashboard-skeleton-line--lg" />
        <div className="dashboard-skeleton-line dashboard-skeleton-line--md" />
      </div>
      <div className="dashboard-skeleton-kpi">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="dashboard-skeleton-card" />
        ))}
      </div>
      <div className="dashboard-skeleton-grid">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="dashboard-skeleton-panel">
            <div className="dashboard-skeleton-panel-head" />
            <div className="dashboard-skeleton-chart" />
          </div>
        ))}
      </div>
    </div>
  )
}

export function DashboardPanelSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="dashboard-skeleton-panel-only" aria-busy="true">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="dashboard-skeleton-row" />
      ))}
    </div>
  )
}
