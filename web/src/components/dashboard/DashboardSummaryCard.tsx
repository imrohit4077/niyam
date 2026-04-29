import type { ReactNode } from 'react'

type TrendDirection = 'up' | 'down' | 'flat'

export type DashboardSummaryCardProps = {
  label: string
  value: string | number
  icon: ReactNode
  /** e.g. "12%" or "—" when no prior period */
  trendPercent: string
  trendDirection: TrendDirection
  sublabel?: string
  /** First card can use primary styling */
  variant?: 'default' | 'primary'
}

function TrendGlyph({ direction }: { direction: TrendDirection }) {
  if (direction === 'up') return <span aria-hidden>↑</span>
  if (direction === 'down') return <span aria-hidden>↓</span>
  return <span aria-hidden>→</span>
}

export function DashboardSummaryCard({
  label,
  value,
  icon,
  trendPercent,
  trendDirection,
  sublabel,
  variant = 'default',
}: DashboardSummaryCardProps) {
  const trendClass =
    trendDirection === 'up'
      ? 'dashboard-kpi-trend--up'
      : trendDirection === 'down'
        ? 'dashboard-kpi-trend--down'
        : 'dashboard-kpi-trend--flat'

  return (
    <article className={`dashboard-kpi-card ${variant === 'primary' ? 'dashboard-kpi-primary' : ''}`}>
      <div className="dashboard-kpi-card-top">
        <span className="dashboard-kpi-label">{label}</span>
        <span className="dashboard-kpi-icon" aria-hidden>
          {icon}
        </span>
      </div>
      <strong className="dashboard-kpi-value">{value}</strong>
      <div className={`dashboard-kpi-trend ${trendClass}`}>
        <TrendGlyph direction={trendDirection} />
        <span>{trendPercent}</span>
        <span className="dashboard-kpi-trend-hint">vs prior 30 days</span>
      </div>
      {sublabel ? <p className="dashboard-kpi-sublabel">{sublabel}</p> : null}
    </article>
  )
}
