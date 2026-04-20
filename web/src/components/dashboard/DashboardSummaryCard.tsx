import type { TrendResult } from './dashboardHelpers'

function TrendBadge({ trend }: { trend: TrendResult }) {
  if (trend.pct == null) {
    return <span className="dashboard-kpi-trend dashboard-kpi-trend-muted">New period</span>
  }
  const arrow = trend.direction > 0 ? '↑' : trend.direction < 0 ? '↓' : '→'
  const kind =
    trend.direction > 0 ? 'dashboard-kpi-trend-up' : trend.direction < 0 ? 'dashboard-kpi-trend-down' : 'dashboard-kpi-trend-flat'
  return (
    <span className={`dashboard-kpi-trend ${kind}`}>
      {arrow} {Math.abs(trend.pct)}%
    </span>
  )
}

export function DashboardSummaryCard({
  label,
  value,
  footnote,
  icon,
  trend,
}: {
  label: string
  value: string | number
  footnote?: string
  icon: React.ReactNode
  trend: TrendResult
}) {
  return (
    <article className="dashboard-summary-card">
      <div className="dashboard-summary-card-top">
        <span className="dashboard-summary-icon" aria-hidden>
          {icon}
        </span>
        <TrendBadge trend={trend} />
      </div>
      <span className="dashboard-summary-label">{label}</span>
      <strong className="dashboard-summary-value">{value}</strong>
      {footnote ? <p className="dashboard-summary-foot">{footnote}</p> : null}
    </article>
  )
}
