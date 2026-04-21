import type { ReactNode } from 'react'

export type DashboardTrend = {
  direction: 'up' | 'down' | 'flat'
  /** e.g. "+12%" or "0%" */
  label: string
}

type Props = {
  icon: ReactNode
  label: string
  value: string | number
  /** Short context under the value (not the trend) */
  hint?: string
  trend?: DashboardTrend
  primary?: boolean
}

export function DashboardSummaryCard({ icon, label, value, hint, trend, primary }: Props) {
  const trendClass =
    trend?.direction === 'up'
      ? 'dashboard-kpi-trend--up'
      : trend?.direction === 'down'
        ? 'dashboard-kpi-trend--down'
        : 'dashboard-kpi-trend--flat'

  return (
    <article className={`dashboard-kpi-card${primary ? ' dashboard-kpi-primary' : ''}`}>
      <div className="dashboard-kpi-card-head">
        <span className="dashboard-kpi-icon" aria-hidden>
          {icon}
        </span>
        {trend && (
          <span className={`dashboard-kpi-trend ${trendClass}`} title="Compared to prior period">
            {trend.direction === 'up' ? '↑' : trend.direction === 'down' ? '↓' : '→'} {trend.label}
          </span>
        )}
      </div>
      <span>{label}</span>
      <strong>{value}</strong>
      {hint ? <p>{hint}</p> : null}
    </article>
  )
}
