import type { ReactNode } from 'react'
import type { TrendSnapshot } from './dashboardMetrics'

type Props = {
  label: string
  value: string | number
  icon: ReactNode
  trend: TrendSnapshot
  /** Secondary line under the value (context, not the trend). */
  hint?: string
  primary?: boolean
}

function TrendBadge({ trend }: { trend: TrendSnapshot }) {
  const arrow = trend.direction === 'up' ? '↑' : trend.direction === 'down' ? '↓' : '→'
  const tone =
    trend.direction === 'up' ? 'dashboard-kpi-trend-up' : trend.direction === 'down' ? 'dashboard-kpi-trend-down' : 'dashboard-kpi-trend-flat'
  const pct = trend.percent
  const label = trend.direction === 'flat' && pct === 0 ? 'No change' : `${arrow} ${pct}%`

  return (
    <span className={`dashboard-kpi-trend ${tone}`} title={`vs prior ${trend.periodLabel}`}>
      {label}
      <span className="dashboard-kpi-trend-period">{trend.periodLabel}</span>
    </span>
  )
}

export function DashboardSummaryCard({ label, value, icon, trend, hint, primary }: Props) {
  return (
    <article className={`dashboard-kpi-card${primary ? ' dashboard-kpi-primary' : ''}`}>
      <div className="dashboard-kpi-card-top">
        <span className="dashboard-kpi-icon" aria-hidden>
          {icon}
        </span>
        <TrendBadge trend={trend} />
      </div>
      <span>{label}</span>
      <strong>{value}</strong>
      {hint ? <p>{hint}</p> : null}
    </article>
  )
}
