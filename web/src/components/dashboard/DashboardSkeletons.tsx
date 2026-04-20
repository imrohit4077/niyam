export function DashboardKpiSkeleton() {
  return (
    <div className="dashboard-summary-card dashboard-summary-card--skeleton" aria-hidden>
      <div className="dashboard-skeleton dashboard-skeleton-icon" />
      <div className="dashboard-skeleton dashboard-skeleton-line dashboard-skeleton-line--short" />
      <div className="dashboard-skeleton dashboard-skeleton-line dashboard-skeleton-line--value" />
      <div className="dashboard-skeleton dashboard-skeleton-line dashboard-skeleton-line--sub" />
    </div>
  )
}

export function DashboardPanelSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="dashboard-panel-skeleton" aria-hidden>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="dashboard-skeleton dashboard-skeleton-block" />
      ))}
    </div>
  )
}
