import type { ReactNode } from 'react'

export type TrendDirection = 'up' | 'down' | 'flat'

export type DashboardKpiStatProps = {
  label: string
  value: string | number
  icon: ReactNode
  trendDirection: TrendDirection
  trendLabel: string
  /** Shown under the trend (e.g. "vs last month") */
  trendContext?: string
  highlight?: boolean
}

export function DashboardKpiStat({
  label,
  value,
  icon,
  trendDirection,
  trendLabel,
  trendContext = 'vs prior month',
  highlight = false,
}: DashboardKpiStatProps) {
  const arrow = trendDirection === 'up' ? '↑' : trendDirection === 'down' ? '↓' : '→'
  const trendClass =
    trendDirection === 'up'
      ? 'dashboard-kpi-stat-trend--up'
      : trendDirection === 'down'
        ? 'dashboard-kpi-stat-trend--down'
        : 'dashboard-kpi-stat-trend--flat'

  return (
    <article className={`dashboard-kpi-stat ${highlight ? 'dashboard-kpi-stat--primary' : ''}`}>
      <div className="dashboard-kpi-stat-top">
        <span className="dashboard-kpi-stat-icon" aria-hidden>
          {icon}
        </span>
        <span className="dashboard-kpi-stat-label">{label}</span>
      </div>
      <strong className="dashboard-kpi-stat-value">{value}</strong>
      <div className={`dashboard-kpi-stat-trend ${trendClass}`}>
        <span className="dashboard-kpi-stat-trend-arrow" aria-hidden>
          {arrow}
        </span>
        <span className="dashboard-kpi-stat-trend-label">{trendLabel}</span>
        <span className="dashboard-kpi-stat-trend-context">{trendContext}</span>
      </div>
    </article>
  )
}
