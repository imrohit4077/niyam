export function DashboardPanelSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="dashboard-skeleton-panel" aria-hidden>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="dashboard-skeleton-line" style={{ width: `${100 - i * 12}%` }} />
      ))}
    </div>
  )
}

export function KpiGridSkeleton() {
  return (
    <div className="dashboard-kpi-grid dashboard-kpi-grid-skeleton" aria-hidden>
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="dashboard-kpi-card dashboard-skeleton-kpi" />
      ))}
    </div>
  )
}
