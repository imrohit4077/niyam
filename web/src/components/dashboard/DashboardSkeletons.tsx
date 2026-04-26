export function DashboardPanelSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="dashboard-panel-skeleton" aria-hidden>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="dashboard-panel-skeleton-row" />
      ))}
    </div>
  )
}

export function DashboardTableSkeleton({ cols = 4, rows = 5 }: { cols?: number; rows?: number }) {
  return (
    <div className="dashboard-table-skeleton-wrap" aria-hidden>
      <div className="dashboard-table-skeleton-head">
        {Array.from({ length: cols }).map((_, i) => (
          <div key={i} className="dashboard-table-skeleton-cell dashboard-table-skeleton-th" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="dashboard-table-skeleton-row">
          {Array.from({ length: cols }).map((_, c) => (
            <div key={c} className="dashboard-table-skeleton-cell" />
          ))}
        </div>
      ))}
    </div>
  )
}
