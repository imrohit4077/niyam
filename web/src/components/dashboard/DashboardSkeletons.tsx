export function DashboardKpiSkeletonGrid() {
  return (
    <div className="dashboard-kpi-grid dashboard-kpi-grid--skeleton" aria-hidden>
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="dashboard-skeleton dashboard-skeleton-kpi" />
      ))}
    </div>
  )
}

export function DashboardPanelSkeleton({ lines = 4 }: { lines?: number }) {
  return (
    <div className="dashboard-skeleton-stack" aria-hidden>
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="dashboard-skeleton dashboard-skeleton-line" style={{ width: `${70 + (i % 3) * 10}%` }} />
      ))}
    </div>
  )
}

export function DashboardChartSkeleton({ short }: { short?: boolean }) {
  return (
    <div className={`dashboard-chart-shell ${short ? 'dashboard-chart-shell-short' : ''} dashboard-skeleton-chart`} aria-hidden />
  )
}

export function DashboardTableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="dashboard-table-skeleton" aria-hidden>
      <div className="dashboard-skeleton dashboard-skeleton-table-row dashboard-skeleton-table-head" />
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="dashboard-skeleton dashboard-skeleton-table-row" />
      ))}
    </div>
  )
}
