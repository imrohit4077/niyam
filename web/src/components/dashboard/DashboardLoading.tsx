export function DashboardLoadingBlock({ label = 'Loading...' }: { label?: string }) {
  return (
    <div className="dashboard-loading-block" role="status" aria-live="polite">
      <div className="spinner" style={{ margin: '0 auto 8px', width: 24, height: 24 }} />
      <span className="dashboard-loading-text">{label}</span>
    </div>
  )
}
