export function DashboardSkeleton() {
  return (
    <div className="dashboard-skeleton-root" aria-busy="true" aria-label="Loading dashboard">
      <div className="dashboard-skeleton-hero">
        <div className="dashboard-skeleton-line dashboard-skeleton-line--sm" />
        <div className="dashboard-skeleton-line dashboard-skeleton-line--lg" />
        <div className="dashboard-skeleton-line dashboard-skeleton-line--md" />
      </div>
      <div className="dashboard-skeleton-kpis">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="dashboard-skeleton-kpi" />
        ))}
      </div>
      <div className="dashboard-skeleton-grid">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="dashboard-skeleton-panel" />
        ))}
      </div>
    </div>
  )
}
