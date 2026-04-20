import type { ReactNode } from 'react'

export type StatTrend = {
  arrow: '↑' | '↓' | '—'
  text: string
  /** When false, trend is styled as a decline (still informational). */
  positive: boolean
}

type Props = {
  icon: ReactNode
  label: string
  value: string | number
  trend?: StatTrend
  sublabel?: string
  primary?: boolean
  loading?: boolean
}

export function DashboardStatCard({ icon, label, value, trend, sublabel, primary, loading }: Props) {
  if (loading) {
    return (
      <article className={`dashboard-stat-card ${primary ? 'dashboard-stat-card--primary' : ''}`}>
        <div className="dashboard-stat-card__top">
          <span className="dashboard-stat-card__icon dashboard-skeleton dashboard-skeleton--icon" aria-hidden />
          <div className="dashboard-stat-card__trend dashboard-skeleton dashboard-skeleton--pill" aria-hidden />
        </div>
        <span className="dashboard-stat-card__label dashboard-skeleton dashboard-skeleton--text-sm" />
        <strong className="dashboard-stat-card__value dashboard-skeleton dashboard-skeleton--value" />
        <p className="dashboard-stat-card__sublabel dashboard-skeleton dashboard-skeleton--text-xs" />
      </article>
    )
  }

  return (
    <article className={`dashboard-stat-card ${primary ? 'dashboard-stat-card--primary' : ''}`}>
      <div className="dashboard-stat-card__top">
        <span className="dashboard-stat-card__icon" aria-hidden>
          {icon}
        </span>
        {trend && (
          <span
            className={`dashboard-stat-card__trend ${trend.positive ? 'dashboard-stat-card__trend--up' : 'dashboard-stat-card__trend--down'}`}
            title="vs prior 30 days"
          >
            <span className="dashboard-stat-card__trend-arrow">{trend.arrow}</span>
            {trend.text}
          </span>
        )}
      </div>
      <span className="dashboard-stat-card__label">{label}</span>
      <strong className="dashboard-stat-card__value">{value}</strong>
      {sublabel ? <p className="dashboard-stat-card__sublabel">{sublabel}</p> : null}
    </article>
  )
}
