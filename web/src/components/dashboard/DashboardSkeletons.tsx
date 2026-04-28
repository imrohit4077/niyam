export function DashboardKpiRowSkeleton() {
  return (
    <div className="dashboard-kpi-skeleton-row" aria-hidden>
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="dashboard-kpi-skeleton-card" />
      ))}
    </div>
  )
}

export function DashboardPanelBodySkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="dashboard-panel-skeleton" aria-hidden>
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="dashboard-panel-skeleton-line" style={{ width: `${72 + (i % 3) * 8}%` }} />
      ))}
    </div>
  )
}

export function DashboardChartSkeleton({ short }: { short?: boolean }) {
  return (
    <div className={`dashboard-chart-skeleton${short ? ' dashboard-chart-skeleton--short' : ''}`} aria-hidden />
  )
}
