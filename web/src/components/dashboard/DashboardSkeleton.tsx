export function DashboardPanelSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="dashboard-skeleton-panel" aria-hidden>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="dashboard-skeleton-line" />
      ))}
    </div>
  )
}

export function DashboardKpiSkeleton() {
  return (
    <div className="dashboard-summary-skeleton-grid" aria-hidden>
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="dashboard-summary-card dashboard-summary-card-skeleton">
          <div className="dashboard-skeleton-shimmer dashboard-skeleton-icon" />
          <div className="dashboard-skeleton-shimmer dashboard-skeleton-label" />
          <div className="dashboard-skeleton-shimmer dashboard-skeleton-value" />
          <div className="dashboard-skeleton-shimmer dashboard-skeleton-sub" />
        </div>
      ))}
    </div>
  )
}
