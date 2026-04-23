export function DashboardKpiSkeleton() {
  return (
    <div className="dashboard-summary-grid dashboard-summary-grid--skeleton" aria-hidden>
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="dashboard-summary-card dashboard-summary-card--skeleton">
          <div className="dashboard-skeleton dashboard-skeleton-circle" />
          <div className="dashboard-skeleton dashboard-skeleton-line dashboard-skeleton-line--short" />
          <div className="dashboard-skeleton dashboard-skeleton-line dashboard-skeleton-line--value" />
        </div>
      ))}
    </div>
  )
}

export function DashboardChartSkeleton({ short }: { short?: boolean }) {
  return (
    <div className={`dashboard-chart-skeleton-wrap${short ? ' dashboard-chart-skeleton-wrap--short' : ''}`} aria-hidden>
      <div className="dashboard-skeleton dashboard-skeleton-chart" />
    </div>
  )
}

export function DashboardTableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="dashboard-table-skeleton" aria-hidden>
      <div className="dashboard-skeleton dashboard-skeleton-line dashboard-skeleton-line--header" />
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="dashboard-table-skeleton-row">
          <div className="dashboard-skeleton dashboard-skeleton-line" />
          <div className="dashboard-skeleton dashboard-skeleton-line dashboard-skeleton-line--narrow" />
          <div className="dashboard-skeleton dashboard-skeleton-line dashboard-skeleton-line--tag" />
        </div>
      ))}
    </div>
  )
}
