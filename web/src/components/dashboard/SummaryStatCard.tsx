import type { ReactNode } from 'react'

export type TrendDirection = 'up' | 'down' | 'flat' | 'neutral'

export type SummaryStatCardProps = {
  label: string
  value: string | number
  icon: ReactNode
  /** Shown next to arrow when `trendPercent` is set (e.g. "vs prior month"). */
  trendContext?: string
  trendDirection: TrendDirection
  /** Month-over-month change; when null, `trendFallback` is shown instead of a %. */
  trendPercent: number | null
  trendFallback?: string
  sublabel?: string
  highlight?: boolean
  loading?: boolean
}

function TrendGlyph({ direction }: { direction: TrendDirection }) {
  if (direction === 'up') return <span aria-hidden>↑</span>
  if (direction === 'down') return <span aria-hidden>↓</span>
  if (direction === 'flat') return <span aria-hidden>→</span>
  return null
}

export function SummaryStatCard({
  label,
  value,
  icon,
  trendContext = 'vs prior month',
  trendDirection,
  trendPercent,
  trendFallback,
  sublabel,
  highlight,
  loading,
}: SummaryStatCardProps) {
  if (loading) {
    return (
      <article className={`dashboard-summary-card dashboard-summary-card-skeleton ${highlight ? 'dashboard-summary-card-highlight' : ''}`}>
        <div className="dashboard-summary-card-top">
          <span className="dashboard-summary-icon dashboard-skeleton-block" />
          <div className="dashboard-summary-skeleton-lines">
            <span className="dashboard-skeleton-line dashboard-skeleton-line-short" />
            <span className="dashboard-skeleton-line dashboard-skeleton-line-value" />
            <span className="dashboard-skeleton-line dashboard-skeleton-line-trend" />
          </div>
        </div>
      </article>
    )
  }

  const trendClass =
    trendDirection === 'up'
      ? 'dashboard-trend-up'
      : trendDirection === 'down'
        ? 'dashboard-trend-down'
        : trendDirection === 'flat'
          ? 'dashboard-trend-flat'
          : 'dashboard-trend-neutral'

  const showPercent = trendPercent !== null && trendDirection !== 'neutral'
  const percentText =
    showPercent && trendPercent !== null
      ? `${trendDirection === 'down' ? '-' : ''}${trendDirection === 'flat' ? '0' : String(Math.abs(trendPercent))}%${trendContext ? ` ${trendContext}` : ''}`
      : null

  return (
    <article className={`dashboard-summary-card ${highlight ? 'dashboard-summary-card-highlight' : ''}`}>
      <div className="dashboard-summary-card-top">
        <span className="dashboard-summary-icon" aria-hidden>
          {icon}
        </span>
        <div className="dashboard-summary-copy">
          <span className="dashboard-summary-label">{label}</span>
          <strong className="dashboard-summary-value">{value}</strong>
          <span className={`dashboard-summary-trend ${trendClass}`}>
            {showPercent ? (
              <>
                <TrendGlyph direction={trendDirection} />
                <span>{percentText}</span>
              </>
            ) : (
              <span>{trendFallback ?? '—'}</span>
            )}
          </span>
        </div>
      </div>
      {sublabel ? <p className="dashboard-summary-sublabel">{sublabel}</p> : null}
    </article>
  )
}
