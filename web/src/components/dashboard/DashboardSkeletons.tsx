export function DashboardPanelSkeleton({ rows = 3 }: { rows?: number }) {
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
    <div className={`dashboard-skeleton-chart ${short ? 'dashboard-skeleton-chart-short' : ''}`} aria-hidden>
      <div className="dashboard-skeleton-chart-inner" />
    </div>
  )
}

export function DashboardStatGridSkeleton() {
  return (
    <div className="dashboard-stat-skeleton-grid" aria-hidden>
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="dashboard-stat-skeleton-card">
          <div className="dashboard-skeleton-pill" />
          <div className="dashboard-skeleton-block dashboard-skeleton-block-lg" />
          <div className="dashboard-skeleton-block dashboard-skeleton-block-sm" />
        </div>
      ))}
    </div>
  )
}
