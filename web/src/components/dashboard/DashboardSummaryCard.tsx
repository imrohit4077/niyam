import type { ReactNode } from 'react'

type TrendDirection = 'up' | 'down' | 'flat'

export type DashboardSummaryCardProps = {
  label: string
  value: string | number
  icon: ReactNode
  /** e.g. "vs prior 30 days" */
  trendLabel?: string
  trendPercent?: number | null
  trendDirection?: TrendDirection
  /** Highlight card with brand gradient */
  primary?: boolean
}

function formatTrendPercent(n: number) {
  const rounded = Math.round(n * 10) / 10
  if (!Number.isFinite(rounded)) return '0'
  return Math.abs(rounded) % 1 === 0 ? String(Math.abs(rounded)) : String(Math.abs(rounded))
}

export function DashboardSummaryCard({
  label,
  value,
  icon,
  trendLabel,
  trendPercent,
  trendDirection = 'flat',
  primary = false,
}: DashboardSummaryCardProps) {
  const hasTrend = trendPercent != null && Number.isFinite(trendPercent)
  const arrow = trendDirection === 'up' ? '↑' : trendDirection === 'down' ? '↓' : '→'
  const trendClass =
    trendDirection === 'up'
      ? 'dashboard-kpi-trend--up'
      : trendDirection === 'down'
        ? 'dashboard-kpi-trend--down'
        : 'dashboard-kpi-trend--flat'

  return (
    <article className={`dashboard-kpi-card dashboard-kpi-card--rich${primary ? ' dashboard-kpi-primary' : ''}`}>
      <div className="dashboard-kpi-card-top">
        <span className="dashboard-kpi-icon" aria-hidden>
          {icon}
        </span>
        <span className="dashboard-kpi-label">{label}</span>
      </div>
      <strong className="dashboard-kpi-value">{value}</strong>
      {hasTrend && (
        <p className={`dashboard-kpi-trend ${trendClass}`}>
          <span className="dashboard-kpi-trend-arrow" aria-hidden>
            {arrow}
          </span>
          <span>{formatTrendPercent(trendPercent!)}%</span>
          {trendLabel ? <span className="dashboard-kpi-trend-caption">{trendLabel}</span> : null}
        </p>
      )}
    </article>
  )
}
