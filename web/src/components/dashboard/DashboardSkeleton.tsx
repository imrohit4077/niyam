export function DashboardKpiSkeleton() {
  return (
    <div className="dashboard-kpi-skeleton-grid" aria-hidden>
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="dashboard-kpi-skeleton-card">
          <div className="dashboard-skeleton-line dashboard-skeleton-line--short" />
          <div className="dashboard-skeleton-line dashboard-skeleton-line--value" />
          <div className="dashboard-skeleton-line dashboard-skeleton-line--tiny" />
        </div>
      ))}
    </div>
  )
}

export function DashboardPanelSkeleton({ lines = 4 }: { lines?: number }) {
  return (
    <div className="dashboard-panel-skeleton" aria-hidden>
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="dashboard-skeleton-line" style={{ width: `${68 + (i % 3) * 8}%` }} />
      ))}
    </div>
  )
}
