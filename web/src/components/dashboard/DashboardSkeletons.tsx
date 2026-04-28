export function DashboardKpiSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="dashboard-kpi-grid" aria-hidden>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="dashboard-kpi-card dashboard-skeleton-card">
          <div className="dashboard-skeleton dashboard-skeleton-icon" />
          <div className="dashboard-skeleton dashboard-skeleton-line dashboard-skeleton-line--sm" />
          <div className="dashboard-skeleton dashboard-skeleton-line dashboard-skeleton-line--lg" />
          <div className="dashboard-skeleton dashboard-skeleton-line dashboard-skeleton-line--md" />
        </div>
      ))}
    </div>
  )
}

export function DashboardChartSkeleton({ short }: { short?: boolean }) {
  return (
    <div
      className={`dashboard-chart-shell ${short ? 'dashboard-chart-shell-short' : ''} dashboard-skeleton-chart`}
      aria-hidden
    >
      <div className="dashboard-skeleton dashboard-skeleton-chart-block" />
    </div>
  )
}

export function DashboardTableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="dashboard-table-skeleton" aria-hidden>
      <div className="dashboard-table-skeleton-row dashboard-table-skeleton-row--head">
        <div className="dashboard-skeleton dashboard-skeleton-line dashboard-skeleton-line--table" />
        <div className="dashboard-skeleton dashboard-skeleton-line dashboard-skeleton-line--table" />
        <div className="dashboard-skeleton dashboard-skeleton-line dashboard-skeleton-line--table" />
        <div className="dashboard-skeleton dashboard-skeleton-line dashboard-skeleton-line--table" />
      </div>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="dashboard-table-skeleton-row">
          <div className="dashboard-skeleton dashboard-skeleton-line dashboard-skeleton-line--table-wide" />
          <div className="dashboard-skeleton dashboard-skeleton-line dashboard-skeleton-line--table-narrow" />
          <div className="dashboard-skeleton dashboard-skeleton-line dashboard-skeleton-line--table-narrow" />
          <div className="dashboard-skeleton dashboard-skeleton-line dashboard-skeleton-line--table" />
        </div>
      ))}
    </div>
  )
}
