import type { ReactNode } from 'react'

type Props = {
  label: string
  value: string | number
  icon: ReactNode
  trendLabel: string
  /** Shown under the trend (e.g. comparison window) */
  trendHint?: string
  /** Highlight first card as brand */
  primary?: boolean
}

export function DashboardSummaryCard({ label, value, icon, trendLabel, trendHint, primary }: Props) {
  return (
    <article className={`dashboard-summary-card${primary ? ' dashboard-summary-card--primary' : ''}`}>
      <div className="dashboard-summary-card-top">
        <span className="dashboard-summary-card-icon" aria-hidden>
          {icon}
        </span>
        <span className="dashboard-summary-card-label">{label}</span>
      </div>
      <strong className="dashboard-summary-card-value">{value}</strong>
      <div className="dashboard-summary-card-trend">
        <span className="dashboard-summary-card-trend-value">{trendLabel}</span>
        {trendHint ? <span className="dashboard-summary-card-trend-hint">{trendHint}</span> : null}
      </div>
    </article>
  )
}
