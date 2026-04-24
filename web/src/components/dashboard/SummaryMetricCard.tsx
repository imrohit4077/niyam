import type { ReactNode } from 'react'

export type TrendDirection = 'up' | 'down' | 'flat'

export type SummaryMetricTrend = {
  direction: TrendDirection
  /** Whole percent vs prior period, e.g. 12 for +12% */
  percent: number | null
  /** When percent is null (e.g. no baseline), short label like "New" */
  fallbackLabel?: string
}

type SummaryMetricCardProps = {
  label: string
  value: string | number
  icon: ReactNode
  trend?: SummaryMetricTrend
  /** Subtitle under the value (not the trend) */
  hint?: string
  primary?: boolean
  loading?: boolean
}

function TrendBadge({ trend }: { trend: SummaryMetricTrend }) {
  const { direction, percent, fallbackLabel } = trend
  const arrow = direction === 'up' ? '↑' : direction === 'down' ? '↓' : '→'
  const tone =
    direction === 'up' ? 'dashboard-kpi-trend-up' : direction === 'down' ? 'dashboard-kpi-trend-down' : 'dashboard-kpi-trend-flat'

  if (percent == null) {
    return (
      <span className={`dashboard-kpi-trend ${tone}`}>
        {fallbackLabel ? `${arrow} ${fallbackLabel}` : '—'}
      </span>
    )
  }

  const signed = percent > 0 ? `+${percent}` : `${percent}`
  return (
    <span className={`dashboard-kpi-trend ${tone}`} title="Compared to the prior period">
      {arrow} {signed}%
    </span>
  )
}

export function SummaryMetricCard({ label, value, icon, trend, hint, primary, loading }: SummaryMetricCardProps) {
  return (
    <article className={`dashboard-kpi-card dashboard-kpi-stat-card${primary ? ' dashboard-kpi-primary' : ''}`}>
      <div className="dashboard-kpi-stat-top">
        <span className="dashboard-kpi-icon" aria-hidden>
          {icon}
        </span>
        {trend && !loading ? <TrendBadge trend={trend} /> : !loading ? <span className="dashboard-kpi-trend dashboard-kpi-trend-flat">—</span> : null}
      </div>
      <span className="dashboard-kpi-stat-label">{label}</span>
      {loading ? (
        <div className="dashboard-kpi-value-skeleton" aria-hidden />
      ) : (
        <strong className="dashboard-kpi-stat-value">{value}</strong>
      )}
      {hint && !loading ? <p className="dashboard-kpi-stat-hint">{hint}</p> : null}
    </article>
  )
}
