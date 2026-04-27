export function DashboardPanelSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="dashboard-skeleton-panel" aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="dashboard-skeleton-line" style={{ width: i === 0 ? '55%' : `${70 + (i % 3) * 8}%` }} />
      ))}
    </div>
  )
}

export function DashboardChartSkeleton({ short }: { short?: boolean }) {
  return (
    <div
      className={`dashboard-chart-shell ${short ? 'dashboard-chart-shell-short' : ''} dashboard-skeleton-chart`}
      aria-busy="true"
      aria-label="Loading chart"
    />
  )
}

export function DashboardKpiRowSkeleton() {
  return (
    <div className="dashboard-summary-grid dashboard-summary-grid--skeleton" aria-busy="true" aria-label="Loading metrics">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="dashboard-summary-card dashboard-summary-card--skeleton">
          <div className="dashboard-skeleton-block dashboard-skeleton-block--circle" />
          <div className="dashboard-skeleton-line dashboard-skeleton-line--sm" style={{ width: '40%' }} />
          <div className="dashboard-skeleton-line" style={{ width: '55%', height: 28 }} />
          <div className="dashboard-skeleton-line dashboard-skeleton-line--sm" style={{ width: '75%' }} />
        </div>
      ))}
    </div>
  )
}
