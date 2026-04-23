export function DashboardKpiSkeleton() {
  return (
    <div className="dashboard-stat-skeleton-grid" aria-busy="true" aria-label="Loading summary">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="dashboard-stat-skeleton-card">
          <div className="dashboard-stat-skeleton-shimmer dashboard-stat-skeleton-icon" />
          <div className="dashboard-stat-skeleton-shimmer dashboard-stat-skeleton-line short" />
          <div className="dashboard-stat-skeleton-shimmer dashboard-stat-skeleton-line value" />
          <div className="dashboard-stat-skeleton-shimmer dashboard-stat-skeleton-line sub" />
        </div>
      ))}
    </div>
  )
}

export function DashboardChartSkeleton({ short }: { short?: boolean }) {
  return (
    <div
      className={`dashboard-chart-skeleton ${short ? 'dashboard-chart-skeleton-short' : ''}`}
      aria-busy="true"
      aria-label="Loading chart"
    >
      <div className="dashboard-stat-skeleton-shimmer dashboard-chart-skeleton-block" />
    </div>
  )
}
