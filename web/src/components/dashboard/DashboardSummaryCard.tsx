import type { ReactNode } from 'react'
import type { TrendDirection } from './dashboardSummaryUtils'

type Props = {
  label: string
  value: number | string
  icon: ReactNode
  trendLabel: string
  trendDirection: TrendDirection
  subtitle?: string
  primary?: boolean
}

export default function DashboardSummaryCard({
  label,
  value,
  icon,
  trendLabel,
  trendDirection,
  subtitle,
  primary,
}: Props) {
  const arrow = trendDirection === 'up' ? '↑' : trendDirection === 'down' ? '↓' : '→'
  const trendClass =
    trendDirection === 'up'
      ? 'dashboard-kpi-trend--up'
      : trendDirection === 'down'
        ? 'dashboard-kpi-trend--down'
        : 'dashboard-kpi-trend--neutral'

  return (
    <article className={`dashboard-kpi-card${primary ? ' dashboard-kpi-primary' : ''}`}>
      <div className="dashboard-kpi-card-top">
        <span className="dashboard-kpi-label">{label}</span>
        <span className="dashboard-kpi-icon" aria-hidden>
          {icon}
        </span>
      </div>
      <strong className="dashboard-kpi-value">{value}</strong>
      <div className="dashboard-kpi-card-bottom">
        <span className={`dashboard-kpi-trend ${trendClass}`} title="vs prior month">
          <span className="dashboard-kpi-trend-arrow" aria-hidden>
            {arrow}
          </span>
          {trendLabel}
        </span>
        {subtitle ? <p className="dashboard-kpi-subtitle">{subtitle}</p> : null}
      </div>
    </article>
  )
}
