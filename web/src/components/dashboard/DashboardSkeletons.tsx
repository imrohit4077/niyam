export function DashboardKpiRowSkeleton() {
  return (
    <div className="dashboard-summary-grid" aria-hidden>
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="dashboard-summary-card dashboard-summary-card--loading">
          <div className="dashboard-summary-card-top">
            <span className="dashboard-summary-skeleton-icon" />
            <span className="dashboard-summary-skeleton-trend" />
          </div>
          <span className="dashboard-summary-skeleton-value" />
          <span className="dashboard-summary-skeleton-label" />
        </div>
      ))}
    </div>
  )
}

export function DashboardChartBlockSkeleton({ short }: { short?: boolean }) {
  return (
    <div className={`dashboard-chart-block-skeleton${short ? ' dashboard-chart-block-skeleton--short' : ''}`} aria-hidden>
      <span className="dashboard-chart-block-skeleton-bar" />
    </div>
  )
}
