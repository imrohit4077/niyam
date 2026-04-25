export function DashboardChartSkeleton({ short }: { short?: boolean }) {
  return (
    <div className={`dashboard-chart-skeleton ${short ? 'dashboard-chart-skeleton--short' : ''}`}>
      <div className="dashboard-chart-skeleton-bars" />
    </div>
  )
}

export function DashboardTableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="dashboard-table-skeleton" role="status" aria-label="Loading table">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="dashboard-table-skeleton-row">
          <span className="dashboard-table-skeleton-cell dashboard-table-skeleton-cell--title" />
          <span className="dashboard-table-skeleton-cell" />
          <span className="dashboard-table-skeleton-cell" />
          <span className="dashboard-table-skeleton-cell" />
        </div>
      ))}
    </div>
  )
}
