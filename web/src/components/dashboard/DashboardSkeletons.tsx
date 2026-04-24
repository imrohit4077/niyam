export function DashboardPanelSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="dashboard-skeleton-panel" aria-hidden>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="dashboard-skeleton-line" style={{ width: i === 0 ? '40%' : `${70 - i * 12}%` }} />
      ))}
    </div>
  )
}

export function DashboardChartSkeleton({ short }: { short?: boolean }) {
  return (
    <div className={`dashboard-chart-skeleton ${short ? 'dashboard-chart-skeleton-short' : ''}`} aria-hidden>
      <div className="dashboard-chart-skeleton-inner" />
    </div>
  )
}
