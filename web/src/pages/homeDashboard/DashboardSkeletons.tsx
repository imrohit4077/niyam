export function DashboardKpiSkeleton() {
  return (
    <article className="dashboard-kpi-card dashboard-kpi-skeleton" aria-hidden>
      <span className="dashboard-kpi-skeleton-line dashboard-kpi-skeleton-line--short" />
      <span className="dashboard-kpi-skeleton-line dashboard-kpi-skeleton-line--value" />
      <span className="dashboard-kpi-skeleton-line dashboard-kpi-skeleton-line--muted" />
    </article>
  )
}

export function DashboardChartSkeleton({ short }: { short?: boolean }) {
  return (
    <div
      className={`dashboard-chart-shell dashboard-chart-skeleton${short ? ' dashboard-chart-shell-short' : ''}`}
      aria-hidden
    />
  )
}
