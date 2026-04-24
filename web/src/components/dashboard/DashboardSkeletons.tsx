export function DashboardPanelSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="dashboard-skeleton-panel" aria-hidden>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="dashboard-skeleton-line" style={{ width: i === 0 ? '55%' : '100%' }} />
      ))}
    </div>
  )
}

export function DashboardChartSkeleton() {
  return <div className="dashboard-skeleton-chart" aria-hidden />
}

export function DashboardTableSkeleton({ cols = 4, bodyRows = 5 }: { cols?: number; bodyRows?: number }) {
  return (
    <div className="dashboard-skeleton-table" aria-hidden>
      <div className="dashboard-skeleton-table-row dashboard-skeleton-table-row--head">
        {Array.from({ length: cols }).map((_, i) => (
          <div key={i} className="dashboard-skeleton-line dashboard-skeleton-line--short" />
        ))}
      </div>
      {Array.from({ length: bodyRows }).map((_, r) => (
        <div key={r} className="dashboard-skeleton-table-row">
          {Array.from({ length: cols }).map((_, c) => (
            <div key={c} className="dashboard-skeleton-line" style={{ opacity: 0.55 + c * 0.08 }} />
          ))}
        </div>
      ))}
    </div>
  )
}
