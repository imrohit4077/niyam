import type { ReactNode } from 'react'

export type TrendDirection = 'up' | 'down' | 'flat'

export type DashboardSummaryCardProps = {
  label: string
  value: string | number
  icon: ReactNode
  trend?: {
    direction: TrendDirection
    percent: number
    caption?: string
  }
  highlight?: boolean
}

function TrendBadge({ direction, percent, caption }: NonNullable<DashboardSummaryCardProps['trend']>) {
  const arrow = direction === 'up' ? '↑' : direction === 'down' ? '↓' : '→'
  const sign = direction === 'down' && percent !== 0 ? '−' : direction === 'up' && percent !== 0 ? '+' : ''
  const pct = percent === 0 && direction === 'flat' ? '0' : `${sign}${Math.abs(Math.round(percent * 10) / 10)}`
  return (
    <div className={`dashboard-summary-trend dashboard-summary-trend--${direction}`} title={caption}>
      <span className="dashboard-summary-trend-arrow" aria-hidden>
        {arrow}
      </span>
      <span className="dashboard-summary-trend-pct">{pct}%</span>
      {caption ? <span className="dashboard-summary-trend-caption">{caption}</span> : null}
    </div>
  )
}

export function DashboardSummaryCard({ label, value, icon, trend, highlight }: DashboardSummaryCardProps) {
  return (
    <article className={`dashboard-summary-card${highlight ? ' dashboard-summary-card--primary' : ''}`}>
      <div className="dashboard-summary-card-top">
        <div className="dashboard-summary-icon" aria-hidden>
          {icon}
        </div>
        {trend ? <TrendBadge {...trend} /> : null}
      </div>
      <span className="dashboard-summary-label">{label}</span>
      <strong className="dashboard-summary-value">{value}</strong>
    </article>
  )
}
