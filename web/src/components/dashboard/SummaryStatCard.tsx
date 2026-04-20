import type { ReactNode } from 'react'

export type SummaryTrend = {
  /** Percentage change vs prior period (integer). */
  pct: number
  /** When true, show neutral dash instead of arrow. */
  neutral?: boolean
}

type SummaryStatCardProps = {
  icon: ReactNode
  label: string
  value: string | number
  /** Subtitle under the value (e.g. period label). */
  hint?: string
  trend?: SummaryTrend
  /** Primary card uses brand gradient. */
  variant?: 'default' | 'primary'
}

function TrendLine({ trend }: { trend: SummaryTrend }) {
  if (trend.neutral) {
    return <span className="dashboard-kpi-trend dashboard-kpi-trend-neutral">—</span>
  }
  const up = trend.pct > 0
  const flat = trend.pct === 0
  const arrow = flat ? '→' : up ? '↑' : '↓'
  const cls = flat ? 'dashboard-kpi-trend-flat' : up ? 'dashboard-kpi-trend-up' : 'dashboard-kpi-trend-down'
  return (
    <span className={`dashboard-kpi-trend ${cls}`}>
      {arrow} {Math.abs(trend.pct)}%
    </span>
  )
}

export function SummaryStatCard({ icon, label, value, hint, trend, variant = 'default' }: SummaryStatCardProps) {
  const rootClass =
    variant === 'primary' ? 'dashboard-kpi-card dashboard-kpi-primary dashboard-kpi-card-rich' : 'dashboard-kpi-card dashboard-kpi-card-rich'
  return (
    <article className={rootClass}>
      <div className="dashboard-kpi-card-top">
        <span className="dashboard-kpi-icon" aria-hidden>
          {icon}
        </span>
        {trend ? <TrendLine trend={trend} /> : null}
      </div>
      <div className="dashboard-kpi-label">{label}</div>
      <strong className="dashboard-kpi-value">{value}</strong>
      {hint ? <p className="dashboard-kpi-hint">{hint}</p> : null}
    </article>
  )
}
