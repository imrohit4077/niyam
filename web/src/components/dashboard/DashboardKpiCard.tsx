import type { ReactNode } from 'react'

export type KpiTrend = {
  /** e.g. +12 or -3 */
  deltaPct: number | null
  /** Short comparison label */
  caption: string
}

type Props = {
  label: string
  value: ReactNode
  icon: ReactNode
  trend: KpiTrend
  primary?: boolean
}

function TrendBadge({ trend }: { trend: KpiTrend }) {
  if (trend.deltaPct == null || Number.isNaN(trend.deltaPct)) {
    return (
      <span className="dashboard-kpi-trend dashboard-kpi-trend-neutral" title={trend.caption}>
        <span className="dashboard-kpi-trend-pct">—</span>
      </span>
    )
  }
  const up = trend.deltaPct > 0
  const flat = trend.deltaPct === 0
  const arrow = flat ? '→' : up ? '↑' : '↓'
  const cls = flat ? 'dashboard-kpi-trend-neutral' : up ? 'dashboard-kpi-trend-up' : 'dashboard-kpi-trend-down'
  const sign = trend.deltaPct > 0 ? '+' : ''
  return (
    <span className={`dashboard-kpi-trend ${cls}`} title={trend.caption}>
      <span className="dashboard-kpi-trend-arrow" aria-hidden>
        {arrow}
      </span>
      <span className="dashboard-kpi-trend-pct">
        {sign}
        {Math.abs(trend.deltaPct)}%
      </span>
    </span>
  )
}

export function DashboardKpiCard({ label, value, icon, trend, primary }: Props) {
  return (
    <article className={`dashboard-kpi-card ${primary ? 'dashboard-kpi-primary' : ''}`}>
      <div className="dashboard-kpi-card-top">
        <span className="dashboard-kpi-icon" aria-hidden>
          {icon}
        </span>
        <TrendBadge trend={trend} />
      </div>
      <span className="dashboard-kpi-label">{label}</span>
      <strong className="dashboard-kpi-value">{value}</strong>
      <p className="dashboard-kpi-caption">{trend.caption}</p>
    </article>
  )
}
