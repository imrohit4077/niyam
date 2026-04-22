import type { ReactNode } from 'react'

export type SummaryTrend = {
  direction: 'up' | 'down' | 'flat' | 'neutral'
  label: string
  hint: string
}

type Props = {
  label: string
  value: ReactNode
  icon: ReactNode
  trend: SummaryTrend
  footnote?: string
  primary?: boolean
}

export function DashboardSummaryCard({ label, value, icon, trend, footnote, primary }: Props) {
  const trendClass =
    trend.direction === 'up'
      ? 'dashboard-summary-trend-up'
      : trend.direction === 'down'
        ? 'dashboard-summary-trend-down'
        : trend.direction === 'flat'
          ? 'dashboard-summary-trend-flat'
          : 'dashboard-summary-trend-neutral'

  return (
    <article className={`dashboard-summary-card${primary ? ' dashboard-summary-card-primary' : ''}`}>
      <div className="dashboard-summary-card-top">
        <span className="dashboard-summary-icon" aria-hidden>
          {icon}
        </span>
        <span className={`dashboard-summary-trend ${trendClass}`} title={trend.hint}>
          {trend.label}
        </span>
      </div>
      <span className="dashboard-summary-label">{label}</span>
      <strong className="dashboard-summary-value">{value}</strong>
      {footnote ? <p className="dashboard-summary-foot">{footnote}</p> : null}
    </article>
  )
}
