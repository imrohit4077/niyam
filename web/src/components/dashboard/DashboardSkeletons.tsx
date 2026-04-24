export function DashboardKpiSkeletonRow() {
  return (
    <div className="dashboard-kpi-skeleton-row" aria-hidden>
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="dashboard-summary-card dashboard-summary-card-skeleton">
          <div className="dashboard-summary-skeleton-icon" />
          <div className="dashboard-summary-skeleton-line dashboard-summary-skeleton-line-short" />
          <div className="dashboard-summary-skeleton-line dashboard-summary-skeleton-line-value" />
          <div className="dashboard-summary-skeleton-line dashboard-summary-skeleton-line-tiny" />
        </div>
      ))}
    </div>
  )
}

export function DashboardPanelBodySkeleton() {
  return (
    <div className="dashboard-panel-skeleton" aria-hidden>
      <div className="dashboard-chart-skeleton" />
      <div className="dashboard-summary-skeleton-line dashboard-summary-skeleton-line-medium" />
    </div>
  )
}
