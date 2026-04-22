export function DashboardKpiSkeleton() {
  return (
    <div className="dashboard-summary-skeleton-grid" aria-hidden>
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="dashboard-summary-skeleton-card">
          <div className="dashboard-skeleton-line dashboard-skeleton-line-short" />
          <div className="dashboard-skeleton-line dashboard-skeleton-line-value" />
          <div className="dashboard-skeleton-line dashboard-skeleton-line-label" />
        </div>
      ))}
    </div>
  )
}

export function DashboardChartSkeleton({ short }: { short?: boolean }) {
  return (
    <div className={`dashboard-chart-skeleton${short ? ' dashboard-chart-skeleton-short' : ''}`} aria-hidden>
      <div className="dashboard-skeleton-block" />
    </div>
  )
}

export function DashboardFeedSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="dashboard-feed-skeleton" aria-hidden>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="dashboard-feed-skeleton-row">
          <div className="dashboard-skeleton-dot" />
          <div className="dashboard-skeleton-lines">
            <div className="dashboard-skeleton-line dashboard-skeleton-line-medium" />
            <div className="dashboard-skeleton-line dashboard-skeleton-line-long" />
          </div>
        </div>
      ))}
    </div>
  )
}
