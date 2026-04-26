export function DashboardPanelSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="dashboard-panel-skeleton" aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="dashboard-panel-skeleton-row" />
      ))}
    </div>
  )
}
