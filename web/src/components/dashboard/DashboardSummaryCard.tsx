import type { ReactNode } from 'react'

export type TrendDirection = 'up' | 'down' | 'flat' | 'none'

export type DashboardSummaryCardProps = {
  label: string
  value: string | number
  icon: ReactNode
  /** Short secondary line, e.g. comparison period */
  hint?: string
  trendPercent: number | null
  trendDirection: TrendDirection
  /** When false, primary styling is not applied */
  primary?: boolean
}

function formatTrendPercent(direction: TrendDirection, pct: number) {
  const rounded = Math.round(pct * 10) / 10
  const abs = Number.isFinite(rounded) ? Math.abs(rounded) : 0
  const sign = direction === 'down' ? '−' : direction === 'up' ? '+' : ''
  return `${sign}${abs}%`
}

export function DashboardSummaryCard({
  label,
  value,
  icon,
  hint,
  trendPercent,
  trendDirection,
  primary = false,
}: DashboardSummaryCardProps) {
  const showTrend = trendDirection !== 'none' && trendPercent != null && Number.isFinite(trendPercent)
  const arrow =
    trendDirection === 'up' ? '↑' : trendDirection === 'down' ? '↓' : trendDirection === 'flat' ? '→' : null

  return (
    <article className={`dashboard-summary-card ${primary ? 'dashboard-summary-card--primary' : ''}`}>
      <div className="dashboard-summary-card__top">
        <span className="dashboard-summary-card__icon" aria-hidden>
          {icon}
        </span>
        {showTrend && arrow ? (
          <span className={`dashboard-summary-card__trend dashboard-summary-card__trend--${trendDirection}`}>
            <span className="dashboard-summary-card__arrow">{arrow}</span>
            <span className="dashboard-summary-card__pct">{formatTrendPercent(trendDirection, trendPercent ?? 0)}</span>
          </span>
        ) : null}
      </div>
      <span className="dashboard-summary-card__label">{label}</span>
      <strong className="dashboard-summary-card__value">{value}</strong>
      {hint ? <p className="dashboard-summary-card__hint">{hint}</p> : null}
    </article>
  )
}
