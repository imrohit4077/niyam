import type { ReactNode } from 'react'
import type { TrendResult } from './dashboardUtils'
import { trendLabel } from './dashboardUtils'

type Props = {
  label: string
  value: string | number
  icon: ReactNode
  trend: TrendResult
  /** Secondary line under the trend */
  sublabel?: string
  highlight?: boolean
}

export default function DashboardSummaryCard({ label, value, icon, trend, sublabel, highlight }: Props) {
  const trendText = trendLabel(trend)
  const trendClass =
    trend.percent === null || trend.percent === 0
      ? trend.symbol === '—'
        ? 'dashboard-summary-trend-neutral'
        : 'dashboard-summary-trend-up'
      : trend.percent > 0
        ? 'dashboard-summary-trend-up'
        : trend.percent < 0
          ? 'dashboard-summary-trend-down'
          : 'dashboard-summary-trend-neutral'

  return (
    <article className={`dashboard-summary-card${highlight ? ' dashboard-summary-card-highlight' : ''}`}>
      <div className="dashboard-summary-card-top">
        <span className="dashboard-summary-icon" aria-hidden>
          {icon}
        </span>
        <span className="dashboard-summary-label">{label}</span>
      </div>
      <strong className="dashboard-summary-value">{value}</strong>
      <div className="dashboard-summary-meta">
        <span className={`dashboard-summary-trend ${trendClass}`} title={trend.hint}>
          {trendText}
        </span>
        {sublabel ? <span className="dashboard-summary-sublabel">{sublabel}</span> : null}
      </div>
    </article>
  )
}
