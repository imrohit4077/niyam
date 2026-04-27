import type { ReactNode } from 'react'

export type TrendDirection = 'up' | 'down' | 'flat'

export function DashboardStatCard({
  icon,
  label,
  value,
  trendPct,
  trendDirection,
  loading,
  footnote,
}: {
  icon: ReactNode
  label: string
  value: string | number
  trendPct: number | null
  trendDirection: TrendDirection
  loading?: boolean
  footnote?: string
}) {
  if (loading) {
    return (
      <article className="dashboard-stat-card dashboard-stat-card--skeleton" aria-busy="true">
        <span className="dashboard-stat-card__skeleton dashboard-stat-card__skeleton--icon" />
        <span className="dashboard-stat-card__skeleton dashboard-stat-card__skeleton--label" />
        <span className="dashboard-stat-card__skeleton dashboard-stat-card__skeleton--value" />
        <span className="dashboard-stat-card__skeleton dashboard-stat-card__skeleton--trend" />
      </article>
    )
  }

  const trendSymbol = trendDirection === 'up' ? '↑' : trendDirection === 'down' ? '↓' : '→'
  const trendText =
    trendPct == null ? 'No prior period' : `${trendSymbol} ${trendPct > 0 ? '+' : ''}${trendPct}% vs prior`

  return (
    <article className="dashboard-stat-card">
      <div className="dashboard-stat-card__top">
        <span className="dashboard-stat-card__icon" aria-hidden>
          {icon}
        </span>
        <span className="dashboard-stat-card__label">{label}</span>
      </div>
      <strong className="dashboard-stat-card__value">{value}</strong>
      <p className={`dashboard-stat-card__trend dashboard-stat-card__trend--${trendDirection}`}>{trendText}</p>
      {footnote ? <p className="dashboard-stat-card__footnote">{footnote}</p> : null}
    </article>
  )
}
