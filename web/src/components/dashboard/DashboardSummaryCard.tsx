import type { ReactNode } from 'react'

export type TrendDirection = 'up' | 'down' | 'flat' | 'neutral'

type Props = {
  icon: ReactNode
  label: string
  value: string | number
  /** Short line under the value (e.g. period label) */
  hint?: string
  trendPercent: number | null
  trendDirection: TrendDirection
  /** When true, use primary accent styling */
  primary?: boolean
}

function trendArrow(direction: TrendDirection) {
  if (direction === 'up') return '↑'
  if (direction === 'down') return '↓'
  if (direction === 'flat') return '→'
  return ''
}

export default function DashboardSummaryCard({
  icon,
  label,
  value,
  hint,
  trendPercent,
  trendDirection,
  primary,
}: Props) {
  const pctLabel = trendPercent === null ? '—' : `${trendPercent > 0 ? '+' : ''}${trendPercent}%`
  const arrow = trendArrow(trendDirection)
  const trendClass =
    trendDirection === 'up'
      ? 'dashboard-summary-trend--up'
      : trendDirection === 'down'
        ? 'dashboard-summary-trend--down'
        : trendDirection === 'flat'
          ? 'dashboard-summary-trend--flat'
          : 'dashboard-summary-trend--neutral'

  return (
    <article className={`dashboard-summary-card${primary ? ' dashboard-summary-card--primary' : ''}`}>
      <div className="dashboard-summary-card-top">
        <span className="dashboard-summary-icon" aria-hidden>
          {icon}
        </span>
        <span className="dashboard-summary-label">{label}</span>
      </div>
      <strong className="dashboard-summary-value">{value}</strong>
      <div className="dashboard-summary-footer">
        <span className={`dashboard-summary-trend ${trendClass}`} title="vs prior 30 days">
          {arrow} {pctLabel}
        </span>
        {hint ? <span className="dashboard-summary-hint">{hint}</span> : null}
      </div>
    </article>
  )
}
