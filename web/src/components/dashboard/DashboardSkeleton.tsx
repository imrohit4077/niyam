export function DashboardPanelSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="dashboard-skeleton-panel" aria-busy aria-label="Loading">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="dashboard-skeleton-line" style={{ width: i === 0 ? '55%' : i === 1 ? '80%' : '70%' }} />
      ))}
    </div>
  )
}

export function DashboardChartSkeleton({ short }: { short?: boolean }) {
  return (
    <div className={`dashboard-chart-shell${short ? ' dashboard-chart-shell-short' : ''} dashboard-skeleton-chart`} aria-busy aria-label="Loading chart" />
  )
}

export function DashboardTableSkeleton({ cols = 4 }: { cols?: number }) {
  return (
    <div className="dashboard-skeleton-table" aria-busy aria-label="Loading table">
      <div className="dashboard-skeleton-table-row dashboard-skeleton-table-row--head">
        {Array.from({ length: cols }, (_, i) => (
          <div key={i} className="dashboard-skeleton-cell" />
        ))}
      </div>
      {Array.from({ length: 5 }, (_, r) => (
        <div key={r} className="dashboard-skeleton-table-row">
          {Array.from({ length: cols }, (_, c) => (
            <div key={c} className="dashboard-skeleton-cell" style={{ opacity: 1 - c * 0.08 }} />
          ))}
        </div>
      ))}
    </div>
  )
}
