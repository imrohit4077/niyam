export function DashboardPanelSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="dashboard-skeleton-panel" aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="dashboard-skeleton-line" />
      ))}
    </div>
  )
}

export function DashboardChartSkeleton({ short }: { short?: boolean }) {
  return (
    <div
      className={`dashboard-skeleton-chart${short ? ' dashboard-skeleton-chart--short' : ''}`}
      aria-busy="true"
      aria-label="Loading chart"
    />
  )
}

export function DashboardKpiSkeleton() {
  return (
    <div className="dashboard-stat-grid dashboard-stat-grid--skeleton" aria-busy="true" aria-label="Loading metrics">
      {Array.from({ length: 4 }, (_, i) => (
        <div key={i} className="dashboard-stat-card dashboard-stat-card--skeleton">
          <div className="dashboard-skeleton-line dashboard-skeleton-line--sm" />
          <div className="dashboard-skeleton-line dashboard-skeleton-line--lg" />
          <div className="dashboard-skeleton-line dashboard-skeleton-line--md" />
        </div>
      ))}
    </div>
  )
}
