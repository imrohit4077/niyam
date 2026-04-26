import type { ReactNode } from 'react'

export type TrendDirection = 'up' | 'down' | 'flat'

export type DashboardSummaryCardProps = {
  label: string
  value: string | number
  icon: ReactNode
  trendLabel: string
  trendDirection: TrendDirection
  trendPercent: number | null
  footnote?: string
  primary?: boolean
  loading?: boolean
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
  trendPercent,
  footnote,
  primary,
  loading,
}: DashboardSummaryCardProps) {
  const trendClass =
    trendDirection === 'up'
      ? 'dashboard-summary-trend-up'
      : trendDirection === 'down'
        ? 'dashboard-summary-trend-down'
        : 'dashboard-summary-trend-flat'

  return (
    <article className={`dashboard-summary-card${primary ? ' dashboard-summary-card-primary' : ''}${loading ? ' dashboard-summary-card-skeleton' : ''}`}>
      <div className="dashboard-summary-card-top">
        <div className="dashboard-summary-icon" aria-hidden>
          {icon}
        </div>
        <span className="dashboard-summary-label">{label}</span>
      </div>
      {loading ? (
        <>
          <div className="dashboard-skeleton-line dashboard-skeleton-line-lg" />
          <div className="dashboard-skeleton-line dashboard-skeleton-line-sm" />
        </>
      ) : (
        <>
          <strong className="dashboard-summary-value">{value}</strong>
          <div className={`dashboard-summary-trend ${trendClass}`}>
            <TrendArrow direction={trendDirection} />
            {trendPercent != null && (
              <span className="dashboard-summary-trend-pct">{trendPercent > 0 ? '+' : ''}{trendPercent}%</span>
            )}
            <span className="dashboard-summary-trend-label">{trendLabel}</span>
          </div>
          {footnote ? <p className="dashboard-summary-footnote">{footnote}</p> : null}
        </>
      )}
    </article>
  )
}
