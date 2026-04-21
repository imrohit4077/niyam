import type { ReactNode } from 'react'

export type TrendDirection = 'up' | 'down' | 'flat'

export type DashboardSummaryCardProps = {
  label: string
  value: string | number
  icon: ReactNode
  /** e.g. "+12%" or "New" */
  trendLabel: string
  trendDirection: TrendDirection
  caption?: string
  /** Primary card uses gradient styling */
  variant?: 'default' | 'primary'
}

function TrendArrow({ direction }: { direction: TrendDirection }) {
  if (direction === 'up') return <span aria-hidden>↑</span>
  if (direction === 'down') return <span aria-hidden>↓</span>
  return <span aria-hidden>→</span>
}

export function DashboardSummaryCard({
  label,
  value,
  icon,
  trendLabel,
  trendDirection,
  caption,
  variant = 'default',
}: DashboardSummaryCardProps) {
  const trendClass =
    trendDirection === 'up'
      ? 'dashboard-summary-trend--up'
      : trendDirection === 'down'
        ? 'dashboard-summary-trend--down'
        : 'dashboard-summary-trend--flat'

  return (
    <article className={`dashboard-summary-card ${variant === 'primary' ? 'dashboard-summary-card--primary' : ''}`}>
      <div className="dashboard-summary-card-top">
        <div className="dashboard-summary-icon" aria-hidden>
          {icon}
        </div>
        <span className={`dashboard-summary-trend ${trendClass}`}>
          <TrendArrow direction={trendDirection} />
          <span>{trendLabel}</span>
        </span>
      </div>
      <span className="dashboard-summary-label">{label}</span>
      <strong className="dashboard-summary-value">{value}</strong>
      {caption ? <p className="dashboard-summary-caption">{caption}</p> : null}
    </article>
  )
}
