import type { ReactNode } from 'react'

export type StatCardTrend = {
  direction: 'up' | 'down' | 'flat'
  pct: number | null
  caption?: string
}

type StatCardProps = {
  label: string
  value: string | number
  icon: ReactNode
  trend?: StatCardTrend
  footnote?: string
  primary?: boolean
}

function TrendBadge({ trend }: { trend: StatCardTrend }) {
  const arrow = trend.direction === 'up' ? '↑' : trend.direction === 'down' ? '↓' : '→'
  const pctText =
    trend.pct === null ? '—' : `${trend.pct > 0 ? '+' : ''}${trend.pct}%`
  const tone =
    trend.direction === 'up' ? 'dashboard-trend--up' : trend.direction === 'down' ? 'dashboard-trend--down' : 'dashboard-trend--flat'

  return (
    <div className={`dashboard-trend ${tone}`} title={trend.caption}>
      <span className="dashboard-trend-arrow" aria-hidden>
        {arrow}
      </span>
      <span className="dashboard-trend-pct">{pctText}</span>
      {trend.caption ? <span className="dashboard-trend-hint">{trend.caption}</span> : null}
    </div>
  )
}

export function StatCard({ label, value, icon, trend, footnote, primary }: StatCardProps) {
  return (
    <article className={`dashboard-stat-card${primary ? ' dashboard-stat-card--primary' : ''}`}>
      <div className="dashboard-stat-card-top">
        <div className="dashboard-stat-icon" aria-hidden>
          {icon}
        </div>
        {trend ? <TrendBadge trend={trend} /> : null}
      </div>
      <span className="dashboard-stat-label">{label}</span>
      <strong className="dashboard-stat-value">{value}</strong>
      {footnote ? <p className="dashboard-stat-footnote">{footnote}</p> : null}
    </article>
  )
}

export function StatCardSkeleton() {
  return (
    <div className="dashboard-stat-card dashboard-stat-card--skeleton" aria-hidden>
      <div className="dashboard-skeleton dashboard-skeleton--icon" />
      <div className="dashboard-skeleton dashboard-skeleton--line sm" />
      <div className="dashboard-skeleton dashboard-skeleton--line lg" />
      <div className="dashboard-skeleton dashboard-skeleton--line md" />
    </div>
  )
}
