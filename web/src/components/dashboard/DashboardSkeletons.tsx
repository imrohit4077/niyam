export function DashboardKpiSkeletonRow() {
  return (
    <div className="dashboard-kpi-grid dashboard-kpi-grid--skeleton" aria-hidden>
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="dashboard-summary-card dashboard-summary-card--skeleton">
          <div className="dashboard-summary-card__top">
            <span className="dashboard-summary-card__skeleton-line dashboard-summary-card__skeleton-line--icon" />
            <span className="dashboard-summary-card__skeleton-line dashboard-summary-card__skeleton-line--sm" />
          </div>
          <span className="dashboard-summary-card__skeleton-line dashboard-summary-card__skeleton-line--label" />
          <span className="dashboard-summary-card__skeleton-line dashboard-summary-card__skeleton-line--lg" />
          <span className="dashboard-summary-card__skeleton-line dashboard-summary-card__skeleton-line--hint" />
        </div>
      ))}
    </div>
  )
}

export function DashboardChartSkeleton({ short }: { short?: boolean }) {
  return (
    <div
      className={`dashboard-chart-shell${short ? ' dashboard-chart-shell-short' : ''} dashboard-chart-shell--skeleton`}
      aria-hidden
    />
  )
}
