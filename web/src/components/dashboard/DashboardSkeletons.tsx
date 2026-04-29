export function DashboardKpiSkeleton() {
  return (
    <div className="dashboard-kpi-skeleton-grid" aria-hidden>
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="dashboard-kpi-skeleton-card">
          <div className="dashboard-skeleton dashboard-skeleton--circle" />
          <div className="dashboard-skeleton-rows">
            <div className="dashboard-skeleton dashboard-skeleton--line-sm" />
            <div className="dashboard-skeleton dashboard-skeleton--line-lg" />
            <div className="dashboard-skeleton dashboard-skeleton--line-xs" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function DashboardChartSkeleton({ short }: { short?: boolean }) {
  return (
    <div className={`dashboard-chart-skeleton ${short ? 'dashboard-chart-skeleton--short' : ''}`} aria-hidden>
      <div className="dashboard-skeleton dashboard-skeleton--block" />
    </div>
  )
}
