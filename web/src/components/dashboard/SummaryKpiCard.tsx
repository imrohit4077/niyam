import type { ReactNode } from 'react'

type Trend = {
  pct: number
  direction: 'up' | 'down' | 'flat'
  label?: string
}

export function SummaryKpiCard({
  icon,
  label,
  value,
  trend,
  footnote,
  highlight,
}: {
  icon: ReactNode
  label: string
  value: string | number
  trend?: Trend
  footnote?: string
  highlight?: boolean
}) {
  const trendLabel = trend?.label ?? 'vs prior 30 days'
  const arrow = trend?.direction === 'up' ? '↑' : trend?.direction === 'down' ? '↓' : '→'
  const trendClass =
    trend?.direction === 'up'
      ? 'dashboard-kpi-trend-up'
      : trend?.direction === 'down'
        ? 'dashboard-kpi-trend-down'
        : 'dashboard-kpi-trend-flat'

  return (
    <article className={`dashboard-kpi-card dashboard-kpi-summary ${highlight ? 'dashboard-kpi-primary' : ''}`}>
      <div className="dashboard-kpi-summary-top">
        <span className="dashboard-kpi-icon" aria-hidden>
          {icon}
        </span>
        <span className="dashboard-kpi-summary-label">{label}</span>
      </div>
      <strong className="dashboard-kpi-summary-value">{value}</strong>
      {trend && (
        <div className={`dashboard-kpi-trend ${trendClass}`} title={trendLabel}>
          <span className="dashboard-kpi-trend-arrow" aria-hidden>
            {arrow}
          </span>
          <span className="dashboard-kpi-trend-pct">{trend.direction === 'flat' ? '0%' : `${trend.pct}%`}</span>
          <span className="dashboard-kpi-trend-caption">{trendLabel}</span>
        </div>
      )}
      {footnote ? <p>{footnote}</p> : null}
    </article>
  )
}
