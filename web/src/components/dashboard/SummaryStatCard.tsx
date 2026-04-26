import type { ReactNode } from 'react'
import type { TrendDirection } from './trendUtils'

type SummaryStatCardProps = {
  icon: ReactNode
  label: string
  value: number | string
  trendLabel: string
  trendDirection: TrendDirection
  trendPct?: number
  highlight?: boolean
  loading?: boolean
}

export default function SummaryStatCard({
  icon,
  label,
  value,
  trendLabel,
  trendDirection,
  trendPct,
  highlight,
  loading,
}: SummaryStatCardProps) {
  const arrow = trendDirection === 'up' ? '↑' : trendDirection === 'down' ? '↓' : '→'
  const trendClass =
    trendDirection === 'up'
      ? 'dashboard-summary-trend-up'
      : trendDirection === 'down'
        ? 'dashboard-summary-trend-down'
        : 'dashboard-summary-trend-flat'

  return (
    <article className={`dashboard-summary-card${highlight ? ' dashboard-summary-card-primary' : ''}`}>
      <div className="dashboard-summary-card-top">
        <span className="dashboard-summary-icon" aria-hidden>
          {icon}
        </span>
        <span className="dashboard-summary-label">{label}</span>
      </div>
      {loading ? (
        <div className="dashboard-summary-skeleton-value" />
      ) : (
        <strong className="dashboard-summary-value">{value}</strong>
      )}
      <div className={`dashboard-summary-trend ${trendClass}`}>
        {loading ? (
          <span className="dashboard-summary-skeleton-trend" />
        ) : (
          <>
            <span className="dashboard-summary-trend-arrow" aria-hidden>
              {arrow}
            </span>
            {trendPct != null && trendPct > 0 && trendDirection !== 'flat' ? (
              <span className="dashboard-summary-trend-pct">{trendPct}%</span>
            ) : null}
            <span className="dashboard-summary-trend-caption">{trendLabel}</span>
          </>
        )}
      </div>
    </article>
  )
}
