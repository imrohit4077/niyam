import type { ReactNode } from 'react'
import type { TrendDirection } from '../../utils/dashboardMetrics'

function TrendChevron({ direction }: { direction: TrendDirection }) {
  if (direction === 'up') {
    return (
      <svg className="dashboard-kpi-trend-icon" width="14" height="14" viewBox="0 0 24 24" aria-hidden>
        <path fill="currentColor" d="M4 12l1.41 1.41L11 7.83V20h2V7.83l5.58 5.59L20 12l-8-8-8 8z" />
      </svg>
    )
  }
  if (direction === 'down') {
    return (
      <svg className="dashboard-kpi-trend-icon" width="14" height="14" viewBox="0 0 24 24" aria-hidden>
        <path fill="currentColor" d="M20 12l-1.41-1.41L13 16.17V4h-2v12.17l-5.58-5.59L4 12l8 8 8-8z" />
      </svg>
    )
  }
  return (
    <svg className="dashboard-kpi-trend-icon dashboard-kpi-trend-flat" width="14" height="14" viewBox="0 0 24 24" aria-hidden>
      <path fill="currentColor" d="M8 12h8v2H8v-2zm0-4h8v2H8V8zm0 8h5v2H8v-2z" />
    </svg>
  )
}

export function SummaryStatCard({
  icon,
  label,
  valueDisplay,
  trend,
  loading,
  primary,
}: {
  icon: ReactNode
  label: string
  valueDisplay: string
  trend: { direction: TrendDirection; label: string; caption: string }
  loading?: boolean
  primary?: boolean
}) {
  return (
    <article className={`dashboard-kpi-card dashboard-kpi-card-rich ${primary ? 'dashboard-kpi-primary' : ''}`}>
      {loading ? (
        <div className="dashboard-kpi-skeleton" aria-hidden>
          <span className="dashboard-skeleton-line dashboard-skeleton-line-short" />
          <span className="dashboard-skeleton-line dashboard-skeleton-line-value" />
          <span className="dashboard-skeleton-line dashboard-skeleton-line-trend" />
        </div>
      ) : (
        <>
          <div className="dashboard-kpi-card-top">
            <div className={`dashboard-kpi-icon-wrap ${primary ? 'dashboard-kpi-icon-wrap-on-primary' : ''}`}>{icon}</div>
            <span className="dashboard-kpi-label">{label}</span>
          </div>
          <strong className="dashboard-kpi-value">{valueDisplay}</strong>
          <div className={`dashboard-kpi-trend dashboard-kpi-trend-${trend.direction}`}>
            <TrendChevron direction={trend.direction} />
            <span className="dashboard-kpi-trend-pct">{trend.label}</span>
            <span className="dashboard-kpi-trend-caption">{trend.caption}</span>
          </div>
        </>
      )}
    </article>
  )
}

export function CandidatesIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="currentColor"
        d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"
      />
    </svg>
  )
}

export function BriefcaseIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="currentColor"
        d="M20 6h-4V4c0-1.11-.89-2-2-2h-4c-1.11 0-2 .89-2 2v2H4c-1.11 0-1.99.89-1.99 2L2 19c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2zm-6 0h-4V4h4v2z"
      />
    </svg>
  )
}

export function CalendarIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="currentColor"
        d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z"
      />
    </svg>
  )
}

export function OfferIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="currentColor"
        d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"
      />
    </svg>
  )
}
