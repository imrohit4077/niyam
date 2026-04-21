import type { ReactNode } from 'react'
import type { TrendDirection } from './dashboardUtils'

type Props = {
  label: string
  value: string | number
  icon: ReactNode
  trendPct: number
  trendDirection: TrendDirection
  trendLabel?: string
  highlight?: boolean
}

function TrendChevron({ direction }: { direction: TrendDirection }) {
  if (direction === 'flat') return <span className="dashboard-kpi-trend-icon dashboard-kpi-trend-flat">—</span>
  return (
    <span className={`dashboard-kpi-trend-icon ${direction === 'up' ? 'dashboard-kpi-trend-up' : 'dashboard-kpi-trend-down'}`}>
      {direction === 'up' ? '↑' : '↓'}
    </span>
  )
}

export function DashboardSummaryCard({
  label,
  value,
  icon,
  trendPct,
  trendDirection,
  trendLabel = 'vs prior period',
  highlight,
}: Props) {
  const pctLabel = trendDirection === 'flat' && trendPct === 0 ? '0%' : `${trendPct}%`

  return (
    <article className={`dashboard-kpi-card dashboard-kpi-summary ${highlight ? 'dashboard-kpi-primary' : ''}`}>
      <div className="dashboard-kpi-summary-top">
        <span className="dashboard-kpi-summary-icon" aria-hidden>
          {icon}
        </span>
        <span className="dashboard-kpi-summary-label">{label}</span>
      </div>
      <strong className="dashboard-kpi-summary-value">{value}</strong>
      <div className="dashboard-kpi-trend" title={trendLabel}>
        <TrendChevron direction={trendDirection} />
        <span className="dashboard-kpi-trend-pct">{pctLabel}</span>
        <span className="dashboard-kpi-trend-caption">{trendLabel}</span>
      </div>
    </article>
  )
}

export function DashboardKpiSkeleton() {
  return (
    <article className="dashboard-kpi-card dashboard-kpi-summary dashboard-kpi-skeleton" aria-busy>
      <div className="dashboard-kpi-summary-top">
        <span className="dashboard-kpi-skeleton-icon" />
        <span className="dashboard-kpi-skeleton-line dashboard-kpi-skeleton-line--short" />
      </div>
      <span className="dashboard-kpi-skeleton-line dashboard-kpi-skeleton-line--value" />
      <span className="dashboard-kpi-skeleton-line dashboard-kpi-skeleton-line--trend" />
    </article>
  )
}
