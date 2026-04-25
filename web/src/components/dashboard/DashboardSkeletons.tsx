export function DashboardKpiSkeletonRow() {
  return (
    <div className="dashboard-summary-skeleton-row" aria-busy aria-label="Loading summary">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="dashboard-summary-skeleton-card">
          <div className="dashboard-skeleton dashboard-skeleton-icon" />
          <div className="dashboard-skeleton dashboard-skeleton-line-sm" />
          <div className="dashboard-skeleton dashboard-skeleton-line-lg" />
          <div className="dashboard-skeleton dashboard-skeleton-line-md" />
        </div>
      ))}
    </div>
  )
}

export function DashboardChartSkeleton({ short }: { short?: boolean }) {
  return (
    <div
      className={`dashboard-chart-skeleton${short ? ' dashboard-chart-skeleton-short' : ''}`}
      aria-busy
      aria-label="Loading chart"
    >
      <div className="dashboard-skeleton dashboard-skeleton-chart-block" />
    </div>
  )
}
