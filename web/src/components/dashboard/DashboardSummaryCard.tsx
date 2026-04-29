import type { ReactNode } from 'react'

type TrendTone = 'up' | 'down' | 'neutral'

const TONE_CLASS: Record<TrendTone, string> = {
  up: 'dashboard-kpi-trend--up',
  down: 'dashboard-kpi-trend--down',
  neutral: 'dashboard-kpi-trend--neutral',
}

type Props = {
  title: string
  value: ReactNode
  sublabel?: string
  /** Week-over-week style delta, e.g. "↑ +12%" */
  trendLabel: string
  trendArrow: string
  trendTone: TrendTone
  icon: ReactNode
  highlight?: boolean
  loading?: boolean
}

function SkeletonCard() {
  return (
    <article className="dashboard-kpi-card dashboard-kpi-card--skeleton" aria-hidden>
      <span className="dashboard-kpi-skeleton dashboard-kpi-skeleton-line" style={{ width: '46%' }} />
      <span className="dashboard-kpi-skeleton dashboard-kpi-skeleton-stat" />
      <span className="dashboard-kpi-skeleton dashboard-kpi-skeleton-line" style={{ width: '72%' }} />
      <span className="dashboard-kpi-skeleton dashboard-kpi-skeleton-trend" />
    </article>
  )
}

export function DashboardSummaryCard({
  title,
  value,
  sublabel,
  trendLabel,
  trendArrow,
  trendTone,
  icon,
  highlight,
  loading,
}: Props) {
  if (loading) return <SkeletonCard />
  return (
    <article className={`dashboard-kpi-card${highlight ? ' dashboard-kpi-primary' : ''}`}>
      <div className="dashboard-kpi-card-head">
        <span className="dashboard-kpi-icon" aria-hidden>
          {icon}
        </span>
        <span className="dashboard-kpi-title">{title}</span>
      </div>
      <strong className="dashboard-kpi-value">{value}</strong>
      {sublabel ? <p>{sublabel}</p> : <p className="dashboard-kpi-muted-placeholder">&nbsp;</p>}
      <div className={`dashboard-kpi-trend ${TONE_CLASS[trendTone]}`}>
        <span className="dashboard-kpi-trend-arrow" aria-hidden>
          {trendArrow}
        </span>
        <span className="dashboard-kpi-trend-label">vs last week: {trendLabel}</span>
      </div>
    </article>
  )
}
