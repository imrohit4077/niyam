import type { ReactNode } from 'react'

export type TrendDirection = 'up' | 'down' | 'flat'

export type DashboardTrend = {
  direction: TrendDirection
  /** Short label, e.g. "+12%" or "New" */
  label: string
}

type Props = {
  label: string
  value: string | number
  /** Secondary line under the value */
  hint?: string
  trend?: DashboardTrend | null
  icon: ReactNode
  variant?: 'default' | 'primary'
  loading?: boolean
}

export function DashboardStatCard({ label, value, hint, trend, icon, variant = 'default', loading }: Props) {
  if (loading) {
    return (
      <article className={`dashboard-stat-card dashboard-stat-card--skeleton ${variant === 'primary' ? 'dashboard-stat-card--primary' : ''}`}>
        <div className="dashboard-stat-card__top">
          <span className="dashboard-stat-card__icon dashboard-skeleton dashboard-skeleton--icon" aria-hidden />
          <span className="dashboard-skeleton dashboard-skeleton--text-sm" style={{ width: '72%' }} />
        </div>
        <span className="dashboard-skeleton dashboard-skeleton--value" />
        <span className="dashboard-skeleton dashboard-skeleton--text-xs" style={{ width: '55%', marginTop: 10 }} />
      </article>
    )
  }

  return (
    <article className={`dashboard-stat-card ${variant === 'primary' ? 'dashboard-stat-card--primary' : ''}`}>
      <div className="dashboard-stat-card__top">
        <span className="dashboard-stat-card__icon" aria-hidden>
          {icon}
        </span>
        <span className="dashboard-stat-card__label">{label}</span>
      </div>
      <div className="dashboard-stat-card__value-row">
        <strong className="dashboard-stat-card__value">{value}</strong>
        {trend ? (
          <span
            className={`dashboard-stat-card__trend dashboard-stat-card__trend--${trend.direction}`}
            title="vs. prior period"
          >
            {trend.direction === 'up' ? '↑' : trend.direction === 'down' ? '↓' : '→'} {trend.label}
          </span>
        ) : null}
      </div>
      {hint ? <p className="dashboard-stat-card__hint">{hint}</p> : null}
    </article>
  )
}
