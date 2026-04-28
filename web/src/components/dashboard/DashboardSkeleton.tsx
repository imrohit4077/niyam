export function DashboardPageSkeleton() {
  return (
    <div className="dashboard-page-skeleton" aria-busy="true" aria-label="Loading dashboard">
      <div className="dashboard-skeleton-hero">
        <div className="dashboard-skeleton-line dashboard-skeleton-line--lg" />
        <div className="dashboard-skeleton-line dashboard-skeleton-line--md" />
        <div className="dashboard-skeleton-line dashboard-skeleton-line--sm" />
      </div>
      <div className="dashboard-kpi-grid">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="dashboard-skeleton-kpi" />
        ))}
      </div>
      <div className="dashboard-grid">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="dashboard-skeleton-panel">
            <div className="dashboard-skeleton-panel-header" />
            <div className="dashboard-skeleton-chart" />
          </div>
        ))}
      </div>
    </div>
  )
}

export function DashboardPanelSkeleton({ short }: { short?: boolean }) {
  return (
    <div className={`dashboard-panel-skeleton${short ? ' dashboard-panel-skeleton--short' : ''}`}>
      <div className="dashboard-skeleton-chart" />
    </div>
  )
}
