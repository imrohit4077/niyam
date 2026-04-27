export function SummaryMetricsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="dashboard-skeleton-kpis dashboard-skeleton-kpis--inline" aria-busy="true" aria-label="Loading metrics">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="dashboard-skeleton-kpi dashboard-skeleton-kpi--metric" />
      ))}
    </div>
  )
}

export function DashboardPageSkeleton() {
  return (
    <div className="dashboard-page-skeleton" aria-busy="true" aria-label="Loading dashboard">
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
      <div className="dashboard-skeleton-panels">
        <div className="dashboard-skeleton-panel" />
        <div className="dashboard-skeleton-panel" />
      </div>
    </div>
  )
}
