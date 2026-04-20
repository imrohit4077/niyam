export function DashboardPanelSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="dashboard-skeleton-panel" aria-hidden>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="dashboard-skeleton-line" />
      ))}
    </div>
  )
}

export function DashboardChartSkeleton() {
  return <div className="dashboard-skeleton-chart" aria-hidden />
}

export function DashboardKpiSkeletonGrid() {
  return (
    <div className="dashboard-kpi-grid dashboard-kpi-grid--skeleton" aria-hidden>
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="dashboard-kpi-card dashboard-kpi-skeleton-card" />
      ))}
    </div>
  )
}
