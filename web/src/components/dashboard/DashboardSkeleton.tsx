export function DashboardPanelSkeleton() {
  return (
    <div className="dashboard-skeleton-panel" aria-hidden>
      <div className="dashboard-skeleton-line dashboard-skeleton-line--title" />
      <div className="dashboard-skeleton-block" />
    </div>
  )
}

export function DashboardKpiSkeletonRow() {
  return (
    <div className="dashboard-kpi-skeleton-row" aria-hidden>
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="dashboard-kpi-skeleton-card" />
      ))}
    </div>
  )
}
