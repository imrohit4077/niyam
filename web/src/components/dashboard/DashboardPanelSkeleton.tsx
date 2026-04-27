type Props = { lines?: number; chart?: boolean }

export function DashboardPanelSkeleton({ lines = 4, chart }: Props) {
  return (
    <div className="dashboard-panel-skeleton" aria-busy="true" aria-label="Loading">
      {chart ? <div className="dashboard-panel-skeleton__chart" /> : null}
      <div className="dashboard-panel-skeleton__lines">
        {Array.from({ length: lines }, (_, i) => (
          <div key={i} className="dashboard-panel-skeleton__line" style={{ width: `${68 + (i % 3) * 8}%` }} />
        ))}
      </div>
    </div>
  )
}
