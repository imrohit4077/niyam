export function DashboardKpiSkeletonRow() {
  return (
    <div className="dashboard-summary-skeleton-row" aria-hidden>
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="dashboard-summary-skeleton-card">
          <div className="dashboard-skeleton dashboard-skeleton--icon" />
          <div className="dashboard-skeleton dashboard-skeleton--label" />
          <div className="dashboard-skeleton dashboard-skeleton--value" />
          <div className="dashboard-skeleton dashboard-skeleton--trend" />
        </div>
      ))}
    </div>
  )
}

export function DashboardChartSkeleton({ short }: { short?: boolean }) {
  return (
    <div className={`dashboard-chart-skeleton${short ? ' dashboard-chart-skeleton--short' : ''}`} aria-hidden>
      <div className="dashboard-skeleton dashboard-skeleton--chart" />
    </div>
  )
}
