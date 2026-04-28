export function DashboardKpiSkeleton() {
  return (
    <div className="dashboard-stat-grid dashboard-stat-grid--skeleton" aria-hidden>
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="dashboard-skeleton dashboard-skeleton-stat" />
      ))}
    </div>
  )
}

export function DashboardPanelSkeleton({ lines = 4 }: { lines?: number }) {
  return (
    <div className="dashboard-skeleton-stack" aria-hidden>
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="dashboard-skeleton dashboard-skeleton-line" style={{ width: `${85 - i * 12}%` }} />
      ))}
    </div>
  )
}

export function DashboardChartSkeleton({ short }: { short?: boolean }) {
  return (
    <div className={`dashboard-skeleton dashboard-skeleton-chart ${short ? 'dashboard-skeleton-chart--short' : ''}`} aria-hidden />
  )
}
