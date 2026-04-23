import type { ReactNode } from 'react'

export type TrendDirection = 'up' | 'down' | 'flat'

export type DashboardSummaryCardProps = {
  icon: ReactNode
  label: string
  value: string | number
  /** Short secondary line under the value */
  hint?: string
  trendPercent: number | null
  trendDirection: TrendDirection
  /** When true, uses primary gradient styling */
  primary?: boolean
  loading?: boolean
}

function formatTrendPercent(direction: TrendDirection, pct: number) {
  const abs = Math.abs(Math.round(pct))
  if (direction === 'flat' || abs === 0) return '0%'
  const sign = direction === 'up' ? '+' : '−'
  return `${sign}${abs}%`
}

export function DashboardSummaryCard({
  icon,
  label,
  value,
  hint,
  trendPercent,
  trendDirection,
  primary,
  loading,
}: DashboardSummaryCardProps) {
  const arrow = trendDirection === 'up' ? '↑' : trendDirection === 'down' ? '↓' : '→'
  const trendLabel =
    trendPercent == null || (trendDirection === 'flat' && (trendPercent === 0 || Number.isNaN(trendPercent)))
      ? 'vs last month'
      : `${arrow} ${formatTrendPercent(trendDirection, trendPercent)} vs last month`

  return (
    <article className={`dashboard-summary-card${primary ? ' dashboard-summary-card--primary' : ''}`}>
      <div className="dashboard-summary-card__top">
        <span className="dashboard-summary-card__icon" aria-hidden>
          {icon}
        </span>
        <span className="dashboard-summary-card__label">{label}</span>
      </div>
      {loading ? (
        <div className="dashboard-summary-card__skeleton" aria-hidden>
          <span className="dashboard-summary-card__skeleton-value" />
          <span className="dashboard-summary-card__skeleton-trend" />
        </div>
      ) : (
        <>
          <strong className="dashboard-summary-card__value">{value}</strong>
          {hint ? <p className="dashboard-summary-card__hint">{hint}</p> : null}
          <span
            className={`dashboard-summary-card__trend dashboard-summary-card__trend--${trendDirection}`}
            title={trendLabel}
          >
            {trendLabel}
          </span>
        </>
      )}
    </article>
  )
}
