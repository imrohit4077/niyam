export function DashboardSummaryGridSkeleton() {
  return (
    <div className="dashboard-summary-grid" aria-busy="true" aria-label="Loading summary">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="dashboard-summary-card dashboard-summary-card--skeleton">
          <div className="dashboard-summary-skeleton-icon" />
          <div className="dashboard-summary-skeleton-line dashboard-summary-skeleton-line--short" />
          <div className="dashboard-summary-skeleton-line dashboard-summary-skeleton-line--value" />
          <div className="dashboard-summary-skeleton-line dashboard-summary-skeleton-line--hint" />
        </div>
      ))}
    </div>
  )
}

export function DashboardChartSkeleton({ short }: { short?: boolean }) {
  return (
    <div
      className={`dashboard-chart-skeleton${short ? ' dashboard-chart-skeleton--short' : ''}`}
      aria-busy="true"
      aria-label="Loading chart"
    />
  )
}

export function DashboardTableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="dashboard-table-skeleton" aria-busy="true" aria-label="Loading table">
      <div className="dashboard-table-skeleton-row dashboard-table-skeleton-row--head">
        <div className="dashboard-table-skeleton-cell" />
        <div className="dashboard-table-skeleton-cell" />
        <div className="dashboard-table-skeleton-cell" />
        <div className="dashboard-table-skeleton-cell" />
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="dashboard-table-skeleton-row">
          <div className="dashboard-table-skeleton-cell" />
          <div className="dashboard-table-skeleton-cell" />
          <div className="dashboard-table-skeleton-cell" />
          <div className="dashboard-table-skeleton-cell" />
        </div>
      ))}
    </div>
  )
}

export function DashboardFeedSkeleton({ items = 6 }: { items?: number }) {
  return (
    <div className="dashboard-feed-skeleton" aria-busy="true" aria-label="Loading activity">
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="dashboard-feed-skeleton-item">
          <div className="dashboard-feed-skeleton-line dashboard-feed-skeleton-line--title" />
          <div className="dashboard-feed-skeleton-line dashboard-feed-skeleton-line--sub" />
        </div>
      ))}
    </div>
  )
}
