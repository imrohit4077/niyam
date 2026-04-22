import type { ReactNode } from 'react'

export type TrendDirection = 'up' | 'down' | 'flat' | 'new'

type Props = {
  label: string
  value: string | number
  icon: ReactNode
  trendLabel: string
  trendDirection: TrendDirection
  subtle?: string
  primary?: boolean
}

export function DashboardStatCard({ label, value, icon, trendLabel, trendDirection, subtle, primary }: Props) {
  const trendClass =
    trendDirection === 'up'
      ? 'dashboard-stat-trend--up'
      : trendDirection === 'down'
        ? 'dashboard-stat-trend--down'
        : trendDirection === 'new'
          ? 'dashboard-stat-trend--new'
          : 'dashboard-stat-trend--flat'

  const arrow = trendDirection === 'up' ? '↑' : trendDirection === 'down' ? '↓' : trendDirection === 'new' ? '↑' : ''

  return (
    <article className={`dashboard-stat-card${primary ? ' dashboard-stat-card--primary' : ''}`}>
      <div className="dashboard-stat-card__top">
        <div className="dashboard-stat-card__icon" aria-hidden>
          {icon}
        </div>
        <span className={`dashboard-stat-trend ${trendClass}`}>
          {arrow ? `${arrow} ` : ''}
          {trendLabel}
        </span>
      </div>
      <span className="dashboard-stat-card__label">{label}</span>
      <strong className="dashboard-stat-card__value">{value}</strong>
      {subtle ? <p className="dashboard-stat-card__subtle">{subtle}</p> : null}
    </article>
  )
}
