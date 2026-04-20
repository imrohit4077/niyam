import type { ReactNode } from 'react'

export type TrendDirection = 'up' | 'down' | 'flat'

export type DashboardSummaryCardProps = {
  label: string
  value: string | number
  icon: ReactNode
  trendPercent: number | null
  trendLabel?: string
  sublabel?: string
  primary?: boolean
  loading?: boolean
}

function trendArrow(dir: TrendDirection) {
  if (dir === 'up') return '↑'
  if (dir === 'down') return '↓'
  return '→'
}

function trendDirection(pct: number): TrendDirection {
  if (pct > 0.5) return 'up'
  if (pct < -0.5) return 'down'
  return 'flat'
}

export function DashboardSummaryCardSkeleton() {
  return (
    <article className="dashboard-summary-card dashboard-summary-card-skeleton" aria-hidden>
      <div className="dashboard-summary-card-top">
        <span className="dashboard-summary-skel-icon" />
        <span className="dashboard-summary-skel-trend" />
      </div>
      <span className="dashboard-summary-skel-value" />
      <span className="dashboard-summary-skel-label" />
    </article>
  )
}

export function DashboardSummaryCard({
  label,
  value,
  icon,
  trendPercent,
  trendLabel,
  sublabel,
  primary,
  loading,
}: DashboardSummaryCardProps) {
  if (loading) {
    return <DashboardSummaryCardSkeleton />
  }

  const pct = trendPercent ?? 0
  const dir = trendDirection(pct)
  const pctAbs = Math.abs(Math.round(pct))
  const trendText =
    trendPercent == null ? '—' : `${trendArrow(dir)} ${pctAbs}%${trendLabel ? ` ${trendLabel}` : ''}`

  return (
    <article className={`dashboard-summary-card${primary ? ' dashboard-summary-card-primary' : ''}`}>
      <div className="dashboard-summary-card-top">
        <span className="dashboard-summary-icon" aria-hidden>
          {icon}
        </span>
        <span
          className={`dashboard-summary-trend dashboard-summary-trend-${dir}`}
          title={trendPercent == null ? undefined : `Change vs prior period: ${pct.toFixed(1)}%`}
        >
          {trendText}
        </span>
      </div>
      <strong className="dashboard-summary-value">{value}</strong>
      <span className="dashboard-summary-label">{label}</span>
      {sublabel ? <p className="dashboard-summary-sublabel">{sublabel}</p> : null}
    </article>
  )
}
