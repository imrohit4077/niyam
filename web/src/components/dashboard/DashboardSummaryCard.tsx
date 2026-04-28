import type { ReactNode } from 'react'

export type TrendDirection = 'up' | 'down' | 'flat' | 'neutral'

export type DashboardSummaryCardProps = {
  label: string
  value: string | number
  icon: ReactNode
  caption?: string
  trendLabel?: string
  trendDirection?: TrendDirection
  primary?: boolean
  loading?: boolean
}

function TrendArrow({ direction }: { direction: TrendDirection }) {
  if (direction === 'up') return <span aria-hidden>↑</span>
  if (direction === 'down') return <span aria-hidden>↓</span>
  if (direction === 'flat') return <span aria-hidden>→</span>
  return null
}

export function DashboardSummaryCard({
  label,
  value,
  icon,
  caption,
  trendLabel,
  trendDirection = 'neutral',
  primary,
  loading,
}: DashboardSummaryCardProps) {
  return (
    <article className={`dashboard-kpi-card dashboard-kpi-card-v2${primary ? ' dashboard-kpi-primary' : ''}`}>
      <div className="dashboard-kpi-card-top">
        <span className="dashboard-kpi-icon" aria-hidden>
          {icon}
        </span>
        {trendLabel != null && trendLabel !== '' && (
          <span
            className={`dashboard-kpi-trend dashboard-kpi-trend-${trendDirection}`}
            title="Compared to prior month"
          >
            <TrendArrow direction={trendDirection} />
            {trendLabel}
          </span>
        )}
      </div>
      {loading ? (
        <div className="dashboard-skeleton dashboard-skeleton-kpi-value" />
      ) : (
        <strong className="dashboard-kpi-value">{value}</strong>
      )}
      <span className="dashboard-kpi-label">{label}</span>
      {caption != null && caption !== '' && <p className="dashboard-kpi-caption">{caption}</p>}
    </article>
  )
}
