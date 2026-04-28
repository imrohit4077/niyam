import type { ReactNode } from 'react'

type TrendDirection = 'up' | 'down' | 'flat'

export type DashboardSummaryCardProps = {
  label: string
  value: string | number
  caption?: string
  icon: ReactNode
  trendPct?: number | null
  trendDirection?: TrendDirection
  trendLabel?: string
  variant?: 'default' | 'primary'
}

function TrendBadge({
  pct,
  direction,
  label,
}: {
  pct: number | null | undefined
  direction: TrendDirection
  label?: string
}) {
  if (label) {
    return <span className="dashboard-kpi-trend dashboard-kpi-trend--custom">{label}</span>
  }
  if (direction === 'flat' && (pct == null || pct === 0)) {
    return <span className="dashboard-kpi-trend dashboard-kpi-trend--flat">—</span>
  }
  if (pct == null) {
    return <span className="dashboard-kpi-trend dashboard-kpi-trend--flat">—</span>
  }
  const arrow = direction === 'up' ? '↑' : '↓'
  const sign = direction === 'up' ? '+' : '−'
  const cls =
    direction === 'up' ? 'dashboard-kpi-trend--up' : 'dashboard-kpi-trend--down'
  return (
    <span className={`dashboard-kpi-trend ${cls}`}>
      {arrow} {sign}
      {Math.abs(Math.round(pct))}%
    </span>
  )
}

export function DashboardSummaryCard({
  label,
  value,
  caption,
  icon,
  trendPct,
  trendDirection = 'flat',
  trendLabel,
  variant = 'default',
}: DashboardSummaryCardProps) {
  const rootClass =
    variant === 'primary' ? 'dashboard-kpi-card dashboard-kpi-primary' : 'dashboard-kpi-card'
  return (
    <article className={rootClass}>
      <div className="dashboard-kpi-card-head">
        <span className="dashboard-kpi-icon" aria-hidden>
          {icon}
        </span>
        <TrendBadge pct={trendPct ?? null} direction={trendDirection} label={trendLabel} />
      </div>
      <span className="dashboard-kpi-label">{label}</span>
      <strong className="dashboard-kpi-value">{value}</strong>
      {caption ? <p className="dashboard-kpi-caption">{caption}</p> : null}
    </article>
  )
}
