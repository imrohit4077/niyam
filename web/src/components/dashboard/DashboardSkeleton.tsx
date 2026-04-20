export function DashboardPanelSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <section className="panel dashboard-panel dashboard-modern-panel dashboard-panel-skeleton">
      <div className="panel-header dashboard-modern-panel-header">
        <span className="panel-header-title skeleton-line skeleton-line-title" />
      </div>
      <div className="panel-body dashboard-modern-panel-body">
        <div className="dashboard-skeleton-stack">
          {Array.from({ length: lines }, (_, i) => (
            <div
              key={i}
              className="skeleton-line skeleton-line-body"
              style={{ width: i === 0 ? '72%' : i === 1 ? '56%' : '88%' }}
            />
          ))}
        </div>
      </div>
    </section>
  )
}

export function DashboardChartSkeleton({ height = 260 }: { height?: number }) {
  return (
    <div className="dashboard-chart-skeleton" style={{ height }} aria-hidden>
      <div className="dashboard-chart-skeleton-inner" />
    </div>
  )
}

export function DashboardKpiRowSkeleton() {
  return (
    <div className="dashboard-kpi-grid dashboard-kpi-grid-skeleton">
      {Array.from({ length: 4 }, (_, i) => (
        <div key={i} className="dashboard-kpi-card dashboard-kpi-skeleton-card">
          <div className="skeleton-line skeleton-kpi-icon" />
          <div className="skeleton-line skeleton-line-label" />
          <div className="skeleton-line skeleton-line-value" />
          <div className="skeleton-line skeleton-line-hint" />
        </div>
      ))}
    </div>
  )
}
