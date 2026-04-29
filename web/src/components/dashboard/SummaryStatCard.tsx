import type { ReactNode } from 'react'

export type TrendDirection = 'up' | 'down' | 'flat'

export type SummaryTrend = {
  direction: TrendDirection
  /** Display string, e.g. "+12%" or "—" */
  label: string
}

type SummaryStatCardProps = {
  title: string
  value: string | number
  icon: ReactNode
  trend?: SummaryTrend
  subtitle?: string
  /** Primary accent styling (first card) */
  highlight?: boolean
}

export function SummaryStatCard({ title, value, icon, trend, subtitle, highlight }: SummaryStatCardProps) {
  const trendClass =
    trend?.direction === 'up'
      ? 'dashboard-stat-trend--up'
      : trend?.direction === 'down'
        ? 'dashboard-stat-trend--down'
        : 'dashboard-stat-trend--flat'

  return (
    <article className={`dashboard-stat-card ${highlight ? 'dashboard-stat-card--primary' : ''}`}>
      <div className="dashboard-stat-card-top">
        <span className="dashboard-stat-icon" aria-hidden>
          {icon}
        </span>
        {trend && (
          <span className={`dashboard-stat-trend ${trendClass}`} title="Compared to prior period">
            {trend.direction === 'up' ? '↑' : trend.direction === 'down' ? '↓' : '·'}
            {trend.label}
          </span>
        )}
      </div>
      <span className="dashboard-stat-label">{title}</span>
      <strong className="dashboard-stat-value">{value}</strong>
      {subtitle && <p className="dashboard-stat-subtitle">{subtitle}</p>}
    </article>
  )
}

export function SummaryStatCardSkeleton() {
  return (
    <div className="dashboard-stat-card dashboard-stat-card--skeleton" aria-hidden>
      <div className="dashboard-stat-skel dashboard-stat-skel-icon" />
      <div className="dashboard-stat-skel dashboard-stat-skel-line dashboard-stat-skel-line--short" />
      <div className="dashboard-stat-skel dashboard-stat-skel-line dashboard-stat-skel-line--value" />
      <div className="dashboard-stat-skel dashboard-stat-skel-line dashboard-stat-skel-line--muted" />
    </div>
  )
}
