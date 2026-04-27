export function DashboardPanelSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="dashboard-skeleton-panel" aria-hidden>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="dashboard-skeleton-line" style={{ width: i === 0 ? '55%' : `${70 - i * 8}%` }} />
      ))}
    </div>
  )
}

export function SummaryCardsSkeleton() {
  return (
    <div className="dashboard-summary-skeleton-grid" aria-hidden>
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="dashboard-summary-skeleton-card">
          <div className="dashboard-skeleton-circle" />
          <div className="dashboard-skeleton-line dashboard-skeleton-line-short" />
          <div className="dashboard-skeleton-line dashboard-skeleton-line-value" />
          <div className="dashboard-skeleton-line" style={{ width: '72%' }} />
        </div>
      ))}
    </div>
  )
}
