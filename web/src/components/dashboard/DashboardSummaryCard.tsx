import type { ReactNode } from 'react'
import type { TrendDirection } from './dashboardTrend'

function TrendBadge({ direction, pct }: { direction: TrendDirection; pct: number | null }) {
  const arrow = direction === 'up' ? '↑' : direction === 'down' ? '↓' : '→'
  const label =
    pct === null ? (direction === 'up' ? 'New' : '—') : direction === 'flat' && pct === 0 ? '0%' : `${arrow} ${pct}%`
  const cls =
    direction === 'up'
      ? 'dashboard-kpi-trend dashboard-kpi-trend--up'
      : direction === 'down'
        ? 'dashboard-kpi-trend dashboard-kpi-trend--down'
        : 'dashboard-kpi-trend dashboard-kpi-trend--flat'
  return <span className={cls}>{label}</span>
}

export function DashboardSummaryCard({
  icon,
  label,
  value,
  trend,
  footnote,
  primary,
}: {
  icon: ReactNode
  label: string
  value: string | number
  trend: { direction: TrendDirection; pct: number | null }
  footnote: string
  primary?: boolean
}) {
  return (
    <article className={`dashboard-kpi-card${primary ? ' dashboard-kpi-primary' : ''}`}>
      <div className="dashboard-kpi-card-head">
        <span className="dashboard-kpi-icon" aria-hidden>
          {icon}
        </span>
        <span className="dashboard-kpi-label">{label}</span>
      </div>
      <div className="dashboard-kpi-value-row">
        <strong>{value}</strong>
        <TrendBadge direction={trend.direction} pct={trend.pct} />
      </div>
      <p>{footnote}</p>
    </article>
  )
}
