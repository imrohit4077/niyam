import type { ReactNode } from 'react'
import type { TrendDirection } from './dashboardUtils'

function TrendArrow({ direction }: { direction: TrendDirection }) {
  if (direction === 'flat') return <span className="dashboard-trend-arrow" aria-hidden>→</span>
  if (direction === 'up') return <span className="dashboard-trend-arrow dashboard-trend-arrow--up" aria-hidden>↑</span>
  return <span className="dashboard-trend-arrow dashboard-trend-arrow--down" aria-hidden>↓</span>
}

export function DashboardSummaryCard({
  label,
  value,
  icon,
  trend,
  trendAriaLabel,
}: {
  label: string
  value: string | number
  icon: ReactNode
  trend?: { direction: TrendDirection; label: string }
  trendAriaLabel?: string
}) {
  return (
    <article className="dashboard-summary-card">
      <div className="dashboard-summary-card-top">
        <span className="dashboard-summary-icon" aria-hidden>
          {icon}
        </span>
        {trend && (
          <span
            className={`dashboard-trend-pill dashboard-trend-pill--${trend.direction}`}
            title={trendAriaLabel}
          >
            <TrendArrow direction={trend.direction} />
            <span>{trend.label}</span>
          </span>
        )}
      </div>
      <strong className="dashboard-summary-value">{value}</strong>
      <span className="dashboard-summary-label">{label}</span>
    </article>
  )
}
