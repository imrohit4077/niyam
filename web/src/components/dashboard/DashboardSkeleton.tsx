export function DashboardSkeletonCards() {
  return (
    <div className="dashboard-summary-grid" aria-busy="true" aria-label="Loading summary">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="dashboard-skeleton-card">
          <div className="dashboard-skeleton-line dashboard-skeleton-line--short" />
          <div className="dashboard-skeleton-line dashboard-skeleton-line--value" />
          <div className="dashboard-skeleton-line dashboard-skeleton-line--foot" />
        </div>
      ))}
    </div>
  )
}

export function DashboardSkeletonPanel() {
  return (
    <div className="dashboard-skeleton-panel" aria-busy="true">
      <div className="dashboard-skeleton-line dashboard-skeleton-line--title" />
      <div className="dashboard-skeleton-block" />
    </div>
  )
}
