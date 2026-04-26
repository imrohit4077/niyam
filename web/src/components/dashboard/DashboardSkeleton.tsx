export function DashboardChartSkeleton({ short }: { short?: boolean }) {
  return (
    <div className={`dashboard-chart-skeleton ${short ? 'dashboard-chart-skeleton-short' : ''}`} aria-hidden>
      <div className="dashboard-chart-skeleton-bars" />
    </div>
  )
}

export function DashboardPanelSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="dashboard-panel-skeleton" aria-hidden>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="dashboard-panel-skeleton-row" style={{ width: `${72 + (i % 3) * 8}%` }} />
      ))}
    </div>
  )
}
