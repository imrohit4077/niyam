import type { ReactNode } from 'react'

export type SummaryTrend = {
  direction: 'up' | 'down' | 'flat'
  /** Whole number percent change vs comparison period (can be negative). */
  percent: number
  comparisonLabel: string
}

type SummaryStatCardProps = {
  icon: ReactNode
  label: string
  value: string | number
  /** Secondary line under the value (context, not a duplicate of trend). */
  hint?: string
  trend?: SummaryTrend | null
  primary?: boolean
}

function TrendBadge({ trend }: { trend: SummaryTrend }) {
  const { direction, percent, comparisonLabel } = trend
  const arrow = direction === 'up' ? '↑' : direction === 'down' ? '↓' : '→'
  const absPct = Math.abs(percent)
  const display =
    direction === 'flat' || absPct === 0 ? '0%' : `${absPct}%`
  const tone =
    direction === 'up' ? 'dashboard-kpi-trend-up' : direction === 'down' ? 'dashboard-kpi-trend-down' : 'dashboard-kpi-trend-flat'

  return (
    <span className={`dashboard-kpi-trend ${tone}`} title={comparisonLabel}>
      <span className="dashboard-kpi-trend-arrow" aria-hidden>
        {arrow}
      </span>
      <span className="dashboard-kpi-trend-pct">{display}</span>
      <span className="dashboard-kpi-trend-label">{comparisonLabel}</span>
    </span>
  )
}

export function SummaryStatCard({ icon, label, value, hint, trend, primary }: SummaryStatCardProps) {
  return (
    <article className={`dashboard-kpi-card dashboard-kpi-stat ${primary ? 'dashboard-kpi-primary' : ''}`}>
      <div className="dashboard-kpi-stat-top">
        <span className="dashboard-kpi-icon" aria-hidden>
          {icon}
        </span>
        {trend ? <TrendBadge trend={trend} /> : null}
      </div>
      <span className="dashboard-kpi-stat-label">{label}</span>
      <strong className="dashboard-kpi-stat-value">{value}</strong>
      {hint ? <p className="dashboard-kpi-stat-hint">{hint}</p> : null}
    </article>
  )
}

export function SummaryStatCardSkeleton() {
  return (
    <div className="dashboard-kpi-card dashboard-kpi-stat dashboard-kpi-skeleton" aria-hidden>
      <div className="dashboard-kpi-skeleton-icon" />
      <div className="dashboard-kpi-skeleton-line dashboard-kpi-skeleton-line--sm" />
      <div className="dashboard-kpi-skeleton-line dashboard-kpi-skeleton-line--lg" />
      <div className="dashboard-kpi-skeleton-line dashboard-kpi-skeleton-line--md" />
    </div>
  )
}
