export function DashboardPanelSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="dashboard-skeleton-panel" aria-busy aria-label="Loading">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="dashboard-skeleton-line" style={{ width: i === 0 ? '55%' : `${70 - i * 8}%` }} />
      ))}
    </div>
  )
}

export function DashboardKpiGridSkeleton() {
  return (
    <div className="dashboard-kpi-grid dashboard-kpi-grid-skeleton" aria-busy aria-label="Loading metrics">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="dashboard-kpi-card dashboard-kpi-skeleton-card">
          <div className="dashboard-skeleton-line dashboard-skeleton-line-short" />
          <div className="dashboard-skeleton-line dashboard-skeleton-line-value" />
          <div className="dashboard-skeleton-line dashboard-skeleton-line-tiny" />
        </div>
      ))}
    </div>
  )
}

export function DashboardChartSkeleton({ short }: { short?: boolean }) {
  return (
    <div
      className={`dashboard-chart-shell${short ? ' dashboard-chart-shell-short' : ''} dashboard-chart-skeleton`}
      aria-busy
      aria-label="Loading chart"
    />
  )
}
