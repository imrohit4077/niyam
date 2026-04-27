import type { ReactNode } from 'react'

type TrendDirection = 'up' | 'down' | 'flat'

export type SummaryMetricCardProps = {
  label: string
  value: string | number
  icon: ReactNode
  trendPercent: number | null
  trendLabel?: string
  primary?: boolean
}

function trendDirection(percent: number): TrendDirection {
  if (percent > 0.5) return 'up'
  if (percent < -0.5) return 'down'
  return 'flat'
}

export function SummaryMetricCard({ label, value, icon, trendPercent, trendLabel, primary }: SummaryMetricCardProps) {
  const dir = trendPercent == null ? null : trendDirection(trendPercent)
  const arrow = dir === 'up' ? '↑' : dir === 'down' ? '↓' : '→'
  const absPct = trendPercent == null ? '' : `${Math.abs(Math.round(trendPercent))}%`
  const trendClass =
    dir === 'up' ? 'dashboard-summary-trend--up' : dir === 'down' ? 'dashboard-summary-trend--down' : 'dashboard-summary-trend--flat'

  return (
    <article className={`dashboard-summary-card${primary ? ' dashboard-summary-card--primary' : ''}`}>
      <div className="dashboard-summary-card-top">
        <span className="dashboard-summary-icon" aria-hidden>
          {icon}
        </span>
        {trendPercent != null && (
          <span className={`dashboard-summary-trend ${trendClass}`} title={trendLabel}>
            <span className="dashboard-summary-trend-arrow">{arrow}</span>
            <span>{absPct}</span>
          </span>
        )}
      </div>
      <span className="dashboard-summary-label">{label}</span>
      <strong className="dashboard-summary-value">{value}</strong>
      {trendLabel ? <p className="dashboard-summary-caption">{trendLabel}</p> : null}
    </article>
  )
}
