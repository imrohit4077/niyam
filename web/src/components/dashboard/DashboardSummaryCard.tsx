import type { ReactNode } from 'react'

export type SummaryTrend = {
  /** e.g. +12, -3 */
  deltaPct: number | null
  /** Short label under the trend */
  caption?: string
}

type Props = {
  icon: ReactNode
  label: string
  value: number | string
  trend?: SummaryTrend
  loading?: boolean
  /** Primary accent card (first in row) */
  primary?: boolean
}

function TrendBadge({ trend }: { trend: SummaryTrend }) {
  if (trend.deltaPct === null || Number.isNaN(trend.deltaPct)) {
    return (
      <span className="dashboard-summary-trend dashboard-summary-trend-neutral" title="Not enough history">
        —
      </span>
    )
  }
  const up = trend.deltaPct > 0
  const flat = trend.deltaPct === 0
  const arrow = flat ? '→' : up ? '↑' : '↓'
  const cls = flat
    ? 'dashboard-summary-trend-neutral'
    : up
      ? 'dashboard-summary-trend-up'
      : 'dashboard-summary-trend-down'
  const sign = trend.deltaPct > 0 ? '+' : ''
  return (
    <span className={`dashboard-summary-trend ${cls}`} title={trend.caption}>
      {arrow} {sign}
      {Math.abs(trend.deltaPct)}%
      {trend.caption ? <span className="dashboard-summary-trend-caption">{trend.caption}</span> : null}
    </span>
  )
}

export function DashboardSummaryCard({ icon, label, value, trend, loading, primary }: Props) {
  return (
    <article className={`dashboard-summary-card ${primary ? 'dashboard-summary-card-primary' : ''}`}>
      <div className="dashboard-summary-card-top">
        <span className="dashboard-summary-icon" aria-hidden>
          {icon}
        </span>
        {trend && !loading ? <TrendBadge trend={trend} /> : null}
      </div>
      {loading ? (
        <>
          <div className="dashboard-skeleton dashboard-skeleton-line dashboard-skeleton-value" />
          <div className="dashboard-skeleton dashboard-skeleton-line dashboard-skeleton-label" />
        </>
      ) : (
        <>
          <strong className="dashboard-summary-value">{value}</strong>
          <span className="dashboard-summary-label">{label}</span>
        </>
      )}
    </article>
  )
}
