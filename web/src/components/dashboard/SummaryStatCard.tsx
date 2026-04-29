import type { ReactNode } from 'react'
import type { TrendDirection } from './trendUtils'

type Props = {
  label: string
  value: string | number
  icon: ReactNode
  trendLabel: string
  trendDirection: TrendDirection
  sublabel?: string
  emphasize?: boolean
}

function TrendArrow({ direction }: { direction: TrendDirection }) {
  if (direction === 'up') return <span aria-hidden>↑</span>
  if (direction === 'down') return <span aria-hidden>↓</span>
  return <span aria-hidden>→</span>
}

export default function SummaryStatCard({
  label,
  value,
  icon,
  trendLabel,
  trendDirection,
  sublabel,
  emphasize,
}: Props) {
  return (
    <article className={`dashboard-summary-card ${emphasize ? 'dashboard-summary-card--primary' : ''}`}>
      <div className="dashboard-summary-card-top">
        <span className="dashboard-summary-icon" aria-hidden>
          {icon}
        </span>
        <div className="dashboard-summary-card-text">
          <span className="dashboard-summary-label">{label}</span>
          <strong className="dashboard-summary-value">{value}</strong>
        </div>
      </div>
      <div className="dashboard-summary-footer">
        <span
          className={`dashboard-summary-trend dashboard-summary-trend--${trendDirection}`}
          title="Change vs prior month (where applicable)"
        >
          <TrendArrow direction={trendDirection} /> {trendLabel}
        </span>
        {sublabel ? <span className="dashboard-summary-sublabel">{sublabel}</span> : null}
      </div>
    </article>
  )
}
