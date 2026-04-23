import type { ReactNode } from 'react'

export type TrendDirection = 'up' | 'down' | 'flat'

type SummaryKpiCardProps = {
  label: string
  value: string | number
  icon: ReactNode
  trendDirection: TrendDirection
  trendPercent: number
  trendCaption: string
  primary?: boolean
  loading?: boolean
}

function TrendGlyph({ direction }: { direction: TrendDirection }) {
  if (direction === 'up') return <span aria-hidden>↑</span>
  if (direction === 'down') return <span aria-hidden>↓</span>
  return <span aria-hidden>→</span>
}

export function SummaryKpiCardSkeleton({ primary }: { primary?: boolean }) {
  return (
    <article className={`dashboard-kpi-card dashboard-kpi-skeleton ${primary ? 'dashboard-kpi-primary' : ''}`} aria-busy>
      <span className="dashboard-kpi-skeleton-line dashboard-kpi-skeleton-line--short" />
      <span className="dashboard-kpi-skeleton-line dashboard-kpi-skeleton-line--value" />
      <span className="dashboard-kpi-skeleton-line dashboard-kpi-skeleton-line--trend" />
    </article>
  )
}

export function SummaryKpiCard({
  label,
  value,
  icon,
  trendDirection,
  trendPercent,
  trendCaption,
  primary,
  loading,
}: SummaryKpiCardProps) {
  if (loading) {
    return <SummaryKpiCardSkeleton primary={primary} />
  }

  const trendClass =
    trendDirection === 'up'
      ? 'dashboard-kpi-trend--up'
      : trendDirection === 'down'
        ? 'dashboard-kpi-trend--down'
        : 'dashboard-kpi-trend--flat'

  const pctLabel =
    trendDirection === 'flat' && trendPercent === 0 ? '0%' : `${trendDirection === 'down' ? '−' : ''}${trendPercent}%`

  return (
    <article className={`dashboard-kpi-card ${primary ? 'dashboard-kpi-primary' : ''}`}>
      <div className="dashboard-kpi-card-top">
        <span className="dashboard-kpi-icon" aria-hidden>
          {icon}
        </span>
        <span className="dashboard-kpi-label">{label}</span>
      </div>
      <strong className="dashboard-kpi-value">{value}</strong>
      <p className={`dashboard-kpi-trend ${trendClass}`}>
        <span className="dashboard-kpi-trend-pct">
          <TrendGlyph direction={trendDirection} /> {pctLabel}
        </span>
        <span className="dashboard-kpi-trend-caption">{trendCaption}</span>
      </p>
    </article>
  )
}
