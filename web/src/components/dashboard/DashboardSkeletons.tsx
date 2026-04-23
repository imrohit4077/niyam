export function DashboardKpiSkeleton() {
  return (
    <div className="dashboard-stat-card dashboard-skeleton" aria-hidden>
      <div className="dashboard-stat-card-top">
        <span className="dashboard-skel-circle" />
        <span className="dashboard-skel-pill" />
      </div>
      <span className="dashboard-skel-line dashboard-skel-line-short" />
      <span className="dashboard-skel-line dashboard-skel-line-value" />
      <span className="dashboard-skel-line dashboard-skel-line-hint" />
    </div>
  )
}

export function DashboardPanelSkeleton({ minHeight = 220 }: { minHeight?: number }) {
  return (
    <div className="dashboard-panel-skeleton dashboard-skeleton" style={{ minHeight }} aria-hidden>
      <div className="dashboard-skel-block" />
      <div className="dashboard-skel-block dashboard-skel-block-sm" />
    </div>
  )
}
