import type { ReactNode } from 'react'
import TrendIndicator from './TrendIndicator'

type Props = {
  icon: ReactNode
  label: string
  value: string | number
  subtitle?: string
  trend?: {
    polarity?: 'up_good' | 'down_good' | 'neutral'
    current: number
    previous: number
    hideWhenNoBaseline?: boolean
  }
  variant?: 'default' | 'primary'
}

export default function DashboardSummaryCard({ icon, label, value, subtitle, trend, variant = 'default' }: Props) {
  return (
    <article className={`dashboard-kpi-card dashboard-summary-card ${variant === 'primary' ? 'dashboard-kpi-primary' : ''}`}>
      <div className="dashboard-summary-card-top">
        <span className="dashboard-summary-icon" aria-hidden>
          {icon}
        </span>
        <div className="dashboard-summary-card-heading">
          <span>{label}</span>
          {trend ? (
            <TrendIndicator
              polarity={trend.polarity}
              current={trend.current}
              previous={trend.previous}
              hideWhenNoBaseline={trend.hideWhenNoBaseline}
            />
          ) : null}
        </div>
      </div>
      <strong>{value}</strong>
      {subtitle ? <p>{subtitle}</p> : null}
    </article>
  )
}
