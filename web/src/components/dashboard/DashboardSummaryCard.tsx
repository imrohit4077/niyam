import type { ReactNode } from 'react'

export type TrendDirection = 'up' | 'down' | 'flat'

export function DashboardSummaryCard({
  icon,
  label,
  value,
  trendPercent,
  trendDirection,
  sublabel,
  primary,
}: {
  icon: ReactNode
  label: string
  value: string | number
  trendPercent: number | null
  trendDirection: TrendDirection
  sublabel?: string
  primary?: boolean
}) {
  const arrow = trendDirection === 'up' ? '↑' : trendDirection === 'down' ? '↓' : '→'
  const trendClass =
    trendDirection === 'up'
      ? 'dashboard-summary-trend-up'
      : trendDirection === 'down'
        ? 'dashboard-summary-trend-down'
        : 'dashboard-summary-trend-flat'

  return (
    <article className={`dashboard-summary-card${primary ? ' dashboard-summary-card-primary' : ''}`}>
      <div className="dashboard-summary-card-top">
        <span className="dashboard-summary-icon" aria-hidden>
          {icon}
        </span>
        {trendPercent != null && (
          <span className={`dashboard-summary-trend ${trendClass}`} title="vs prior 30 days">
            {arrow} {trendPercent}%
          </span>
        )}
      </div>
      <span className="dashboard-summary-label">{label}</span>
      <strong className="dashboard-summary-value">{value}</strong>
      {sublabel ? <p className="dashboard-summary-sublabel">{sublabel}</p> : null}
    </article>
  )
}
