import type { ReactNode } from 'react'

type TrendDirection = 'up' | 'down' | 'flat' | 'neutral'

export type DashboardSummaryCardProps = {
  label: string
  value: string | number
  icon: ReactNode
  trendLabel: string
  trendDirection?: TrendDirection
  highlight?: boolean
  loading?: boolean
}

function TrendGlyph({ direction }: { direction: TrendDirection }) {
  if (direction === 'up') return <span className="dashboard-kpi-trend-arrow">↑</span>
  if (direction === 'down') return <span className="dashboard-kpi-trend-arrow">↓</span>
  if (direction === 'flat') return <span className="dashboard-kpi-trend-arrow">→</span>
  return null
}

export function DashboardSummaryCard({
  label,
  value,
  icon,
  trendLabel,
  trendDirection = 'neutral',
  highlight,
  loading,
}: DashboardSummaryCardProps) {
  if (loading) {
    return (
      <article className={`dashboard-kpi-card dashboard-kpi-card-skeleton ${highlight ? 'dashboard-kpi-primary' : ''}`}>
        <div className="dashboard-kpi-skeleton-row">
          <span className="dashboard-kpi-skeleton-icon" />
          <span className="dashboard-kpi-skeleton-label" />
        </div>
        <span className="dashboard-kpi-skeleton-value" />
        <span className="dashboard-kpi-skeleton-trend" />
      </article>
    )
  }

  return (
    <article className={`dashboard-kpi-card ${highlight ? 'dashboard-kpi-primary' : ''}`}>
      <div className="dashboard-kpi-card-top">
        <span className="dashboard-kpi-icon" aria-hidden>
          {icon}
        </span>
        <span className="dashboard-kpi-label">{label}</span>
      </div>
      <strong className="dashboard-kpi-value">{value}</strong>
      <p className={`dashboard-kpi-trend dashboard-kpi-trend-${trendDirection}`}>
        <TrendGlyph direction={trendDirection} />
        <span>{trendLabel}</span>
      </p>
    </article>
  )
}
