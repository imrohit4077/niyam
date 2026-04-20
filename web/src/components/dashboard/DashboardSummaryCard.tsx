import type { ReactNode } from 'react'

export type TrendDirection = 'up' | 'down' | 'flat'

export type DashboardSummaryCardProps = {
  label: string
  value: string | number
  icon: ReactNode
  trendLabel: string
  trendDirection: TrendDirection
  sublabel?: string
  highlight?: boolean
  loading?: boolean
}

function TrendArrow({ direction }: { direction: TrendDirection }) {
  if (direction === 'up') return <span aria-hidden>↑</span>
  if (direction === 'down') return <span aria-hidden>↓</span>
  return <span aria-hidden>→</span>
}

export function DashboardSummaryCardSkeleton() {
  return (
    <article className="dashboard-summary-card dashboard-summary-card--skeleton" aria-busy="true">
      <div className="dashboard-summary-card__top">
        <div className="dashboard-skeleton dashboard-skeleton--icon" />
        <div className="dashboard-skeleton dashboard-skeleton--trend" />
      </div>
      <div className="dashboard-skeleton dashboard-skeleton--value" />
      <div className="dashboard-skeleton dashboard-skeleton--label" />
      <div className="dashboard-skeleton dashboard-skeleton--sub" />
    </article>
  )
}

export function DashboardSummaryCard({
  label,
  value,
  icon,
  trendLabel,
  trendDirection,
  sublabel,
  highlight,
  loading,
}: DashboardSummaryCardProps) {
  if (loading) {
    return <DashboardSummaryCardSkeleton />
  }

  const trendClass =
    trendDirection === 'up'
      ? 'dashboard-summary-card__trend--up'
      : trendDirection === 'down'
        ? 'dashboard-summary-card__trend--down'
        : 'dashboard-summary-card__trend--flat'

  return (
    <article className={`dashboard-summary-card${highlight ? ' dashboard-summary-card--highlight' : ''}`}>
      <div className="dashboard-summary-card__top">
        <div className="dashboard-summary-card__icon" aria-hidden>
          {icon}
        </div>
        <div className={`dashboard-summary-card__trend ${trendClass}`} title={trendLabel}>
          <TrendArrow direction={trendDirection} />
          <span>{trendLabel}</span>
        </div>
      </div>
      <strong className="dashboard-summary-card__value">{value}</strong>
      <span className="dashboard-summary-card__label">{label}</span>
      {sublabel ? <p className="dashboard-summary-card__sub">{sublabel}</p> : null}
    </article>
  )
}
