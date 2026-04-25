import type { ReactNode } from 'react'

export type TrendDirection = 'up' | 'down' | 'flat'

type Props = {
  label: string
  value: string | number
  icon: ReactNode
  trend?: { direction: TrendDirection; pct: number; caption: string }
  highlight?: boolean
}

export function DashboardSummaryCard({ label, value, icon, trend, highlight }: Props) {
  const arrow = trend?.direction === 'up' ? '↑' : trend?.direction === 'down' ? '↓' : '→'
  const trendClass =
    trend?.direction === 'up'
      ? 'dashboard-summary-trend--up'
      : trend?.direction === 'down'
        ? 'dashboard-summary-trend--down'
        : 'dashboard-summary-trend--flat'

  return (
    <article className={`dashboard-summary-card${highlight ? ' dashboard-summary-card--primary' : ''}`}>
      <div className="dashboard-summary-card-top">
        <span className="dashboard-summary-icon" aria-hidden>
          {icon}
        </span>
        {trend && (
          <span className={`dashboard-summary-trend ${trendClass}`} title={trend.caption}>
            <span className="dashboard-summary-trend-arrow" aria-hidden>
              {arrow}
            </span>
            <span className="dashboard-summary-trend-pct">{trend.pct}%</span>
          </span>
        )}
      </div>
      <strong className="dashboard-summary-value">{value}</strong>
      <span className="dashboard-summary-label">{label}</span>
      {trend && <p className="dashboard-summary-caption">{trend.caption}</p>}
    </article>
  )
}
