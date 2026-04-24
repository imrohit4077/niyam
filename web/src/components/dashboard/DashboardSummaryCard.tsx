import type { ReactNode } from 'react'

export type TrendDirection = 'up' | 'down' | 'flat'

export type DashboardSummaryCardProps = {
  label: string
  value: string | number
  icon: ReactNode
  trend?: { direction: TrendDirection; percent: number | null; caption?: string }
  sublabel?: string
  highlight?: boolean
}

function TrendBadge({ direction, percent, caption }: NonNullable<DashboardSummaryCardProps['trend']>) {
  const arrow = direction === 'up' ? '↑' : direction === 'down' ? '↓' : '→'
  const pct =
    percent == null || Number.isNaN(percent)
      ? null
      : `${percent > 0 ? '+' : ''}${Math.round(percent)}%`
  const pctPart = pct != null ? `${arrow} ${pct}` : `${arrow} —`
  const label = caption ? `${pctPart} · ${caption}` : pctPart
  const cls =
    direction === 'up'
      ? 'dashboard-summary-trend dashboard-summary-trend-up'
      : direction === 'down'
        ? 'dashboard-summary-trend dashboard-summary-trend-down'
        : 'dashboard-summary-trend dashboard-summary-trend-flat'

  return <span className={cls}>{label}</span>
}

export function DashboardSummaryCard({
  label,
  value,
  icon,
  trend,
  sublabel,
  highlight,
}: DashboardSummaryCardProps) {
  return (
    <article
      className={`dashboard-summary-card${highlight ? ' dashboard-summary-card-highlight' : ''}`}
    >
      <div className="dashboard-summary-card-top">
        <span className="dashboard-summary-icon" aria-hidden>
          {icon}
        </span>
        {trend ? <TrendBadge {...trend} /> : null}
      </div>
      <span className="dashboard-summary-label">{label}</span>
      <strong className="dashboard-summary-value">{value}</strong>
      {sublabel ? <p className="dashboard-summary-sublabel">{sublabel}</p> : null}
    </article>
  )
}
