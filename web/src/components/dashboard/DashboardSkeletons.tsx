export function DashboardKpiSkeletonGrid() {
  return (
    <div className="dashboard-kpi-grid dashboard-kpi-grid-skeleton" aria-hidden>
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="dashboard-skeleton-card">
          <div className="dashboard-skeleton dashboard-skeleton-icon" />
          <div className="dashboard-skeleton dashboard-skeleton-line sm" />
          <div className="dashboard-skeleton dashboard-skeleton-line lg" />
          <div className="dashboard-skeleton dashboard-skeleton-line md" />
        </div>
      ))}
    </div>
  )
}

export function DashboardChartSkeleton({ short }: { short?: boolean }) {
  return (
    <div className={`dashboard-chart-shell ${short ? 'dashboard-chart-shell-short' : ''} dashboard-chart-skeleton-wrap`} aria-hidden>
      <div className="dashboard-skeleton dashboard-skeleton-chart" />
    </div>
  )
}

export function DashboardTableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="dashboard-table-skeleton" aria-hidden>
      <div className="dashboard-table-skeleton-head">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="dashboard-skeleton dashboard-skeleton-line sm" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="dashboard-table-skeleton-row">
          {Array.from({ length: 4 }).map((_, c) => (
            <div key={c} className="dashboard-skeleton dashboard-skeleton-line md" />
          ))}
        </div>
      ))}
    </div>
  )
}

export function DashboardFeedSkeleton({ items = 6 }: { items?: number }) {
  return (
    <div className="dashboard-feed-skeleton" aria-hidden>
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="dashboard-feed-skeleton-item">
          <div className="dashboard-skeleton dashboard-skeleton-dot" />
          <div className="dashboard-feed-skeleton-lines">
            <div className="dashboard-skeleton dashboard-skeleton-line md" />
            <div className="dashboard-skeleton dashboard-skeleton-line sm" />
          </div>
        </div>
      ))}
    </div>
  )
}
