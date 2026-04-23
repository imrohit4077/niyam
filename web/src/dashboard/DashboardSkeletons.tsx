export function DashboardKpiSkeleton() {
  return (
    <article className="dashboard-kpi-card dashboard-kpi-skeleton" aria-hidden>
      <div className="dashboard-skel-line dashboard-skel-w40" />
      <div className="dashboard-skel-line dashboard-skel-value" />
      <div className="dashboard-skel-line dashboard-skel-w60" />
    </article>
  )
}

export function DashboardPanelSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="dashboard-panel-skeleton" aria-hidden>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="dashboard-skel-block" />
      ))}
    </div>
  )
}

export function DashboardChartSkeleton() {
  return <div className="dashboard-chart-skeleton" aria-hidden />
}
