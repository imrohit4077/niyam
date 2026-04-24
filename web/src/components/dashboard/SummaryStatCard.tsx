import type { ReactNode } from 'react'
import type { TrendDirection } from './trendUtils'

type SummaryStatCardProps = {
  icon: ReactNode
  label: string
  value: string | number
  /** Short caption under the value (e.g. period label) */
  hint?: string
  trendPct: number
  trendDirection: TrendDirection
  /** When true, "up" trend is styled positively (e.g. more candidates). */
  positiveWhenUp?: boolean
  loading?: boolean
}

export function SummaryStatCard({
  icon,
  label,
  value,
  hint,
  trendPct,
  trendDirection,
  positiveWhenUp = true,
  loading,
}: SummaryStatCardProps) {
  if (loading) {
    return (
      <article className="dashboard-summary-card dashboard-summary-card-skeleton" aria-busy="true">
        <div className="dashboard-summary-skel-icon" />
        <div className="dashboard-summary-skel-line dashboard-summary-skel-label" />
        <div className="dashboard-summary-skel-line dashboard-summary-skel-value" />
        <div className="dashboard-summary-skel-line dashboard-summary-skel-trend" />
      </article>
    )
  }

  const trendNeutral = trendDirection === 'flat'
  const trendGood =
    trendNeutral ? false : positiveWhenUp ? trendDirection === 'up' : trendDirection === 'down'
  const trendBad =
    trendNeutral ? false : positiveWhenUp ? trendDirection === 'down' : trendDirection === 'up'
  const arrow = trendDirection === 'up' ? '↑' : trendDirection === 'down' ? '↓' : '→'
  const trendLabel = trendNeutral && trendPct === 0 ? 'vs prior 30d' : `${arrow} ${trendPct}% vs prior 30d`

  return (
    <article className="dashboard-summary-card">
      <div className="dashboard-summary-card-top">
        <span className="dashboard-summary-icon" aria-hidden="true">
          {icon}
        </span>
        <span className="dashboard-summary-label">{label}</span>
      </div>
      <strong className="dashboard-summary-value">{value}</strong>
      {hint ? <p className="dashboard-summary-hint">{hint}</p> : null}
      <span
        className={`dashboard-summary-trend ${trendGood ? 'dashboard-summary-trend-good' : ''} ${trendBad ? 'dashboard-summary-trend-bad' : ''} ${trendNeutral ? 'dashboard-summary-trend-neutral' : ''}`}
      >
        {trendLabel}
      </span>
    </article>
  )
}
