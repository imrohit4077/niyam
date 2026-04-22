export function DashboardKpiSkeleton() {
  return (
    <div className="dashboard-kpi-skeleton-grid" aria-hidden>
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="dashboard-skeleton dashboard-skeleton-kpi" />
      ))}
    </div>
  )
}

export function DashboardPanelSkeleton({ tall }: { tall?: boolean }) {
  return (
    <div className={`dashboard-skeleton-panel${tall ? ' dashboard-skeleton-panel--tall' : ''}`} aria-hidden>
      <div className="dashboard-skeleton dashboard-skeleton-line" style={{ width: '40%' }} />
      <div className="dashboard-skeleton dashboard-skeleton-block" />
    </div>
  )
}
