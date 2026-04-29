export function DashboardKpiSkeletonGrid() {
  return (
    <div className="dashboard-kpi-grid dashboard-kpi-grid--skeleton" aria-busy="true" aria-label="Loading summary">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="dashboard-skeleton dashboard-skeleton-kpi" />
      ))}
    </div>
  )
}

export function DashboardPanelSkeleton({ tall }: { tall?: boolean }) {
  return (
    <div className={`dashboard-skeleton-panel ${tall ? 'dashboard-skeleton-panel--tall' : ''}`} aria-hidden>
      <div className="dashboard-skeleton dashboard-skeleton-line dashboard-skeleton-line--title" />
      <div className="dashboard-skeleton dashboard-skeleton-block" />
    </div>
  )
}

export function DashboardChartSkeleton({ short }: { short?: boolean }) {
  return (
    <div
      className={`dashboard-skeleton dashboard-skeleton-chart ${short ? 'dashboard-skeleton-chart--short' : ''}`}
      aria-busy="true"
      aria-label="Loading chart"
    />
  )
}
