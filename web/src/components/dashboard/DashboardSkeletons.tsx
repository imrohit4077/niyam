export function DashboardKpiSkeleton() {
  return (
    <div className="dashboard-summary-skeleton-grid" aria-hidden>
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="dashboard-summary-card dashboard-summary-card-skeleton">
          <div className="dashboard-skeleton-shimmer dashboard-skeleton-icon" />
          <div className="dashboard-skeleton-shimmer dashboard-skeleton-line-sm" />
          <div className="dashboard-skeleton-shimmer dashboard-skeleton-line-lg" />
          <div className="dashboard-skeleton-shimmer dashboard-skeleton-line-md" />
        </div>
      ))}
    </div>
  )
}

export function DashboardChartSkeleton({ short }: { short?: boolean }) {
  return (
    <div
      className={`dashboard-chart-skeleton dashboard-skeleton-shimmer${short ? ' dashboard-chart-skeleton-short' : ''}`}
      aria-hidden
    />
  )
}

export function DashboardTableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="dashboard-table-skeleton" aria-hidden>
      <div className="dashboard-table-skeleton-head dashboard-skeleton-shimmer" />
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="dashboard-table-skeleton-row">
          <div className="dashboard-skeleton-shimmer dashboard-skeleton-cell-wide" />
          <div className="dashboard-skeleton-shimmer dashboard-skeleton-cell-narrow" />
          <div className="dashboard-skeleton-shimmer dashboard-skeleton-cell-narrow" />
          <div className="dashboard-skeleton-shimmer dashboard-skeleton-cell-mid" />
        </div>
      ))}
    </div>
  )
}
