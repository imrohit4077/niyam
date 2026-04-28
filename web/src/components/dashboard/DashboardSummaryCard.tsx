import type { ReactNode } from 'react'

export type DashboardSummaryIcon = 'candidates' | 'jobs' | 'interviews' | 'offers'

const ICONS: Record<DashboardSummaryIcon, ReactNode> = {
  candidates: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  jobs: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <rect x="2" y="7" width="20" height="14" rx="2" />
      <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
    </svg>
  ),
  interviews: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  ),
  offers: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M20 12v10H4V12" />
      <path d="M2 7h20v5H2z" />
      <path d="M12 22V7" />
      <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z" />
      <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" />
    </svg>
  ),
}

export function DashboardSummaryCard({
  icon,
  label,
  value,
  subtitle,
  trendLabel,
  trendPct,
  trendPositive,
  loading,
  highlight,
}: {
  icon: DashboardSummaryIcon
  label: string
  value: string | number
  subtitle?: string
  trendLabel?: string
  trendPct?: string
  trendPositive?: boolean
  loading?: boolean
  highlight?: boolean
}) {
  return (
    <article className={`dashboard-summary-card ${highlight ? 'dashboard-summary-card-highlight' : ''}`}>
      <div className="dashboard-summary-card-top">
        <span className="dashboard-summary-icon" aria-hidden>
          {ICONS[icon]}
        </span>
        <span className="dashboard-summary-label">{label}</span>
      </div>
      {loading ? (
        <div className="dashboard-summary-skeleton" aria-busy="true" aria-label="Loading">
          <span className="dashboard-summary-skeleton-line dashboard-summary-skeleton-value" />
          <span className="dashboard-summary-skeleton-line dashboard-summary-skeleton-trend" />
        </div>
      ) : (
        <>
          <strong className="dashboard-summary-value">{value}</strong>
          {(trendPct != null && trendPct !== '') || trendLabel ? (
            <div className="dashboard-summary-trend-row">
              {trendPct != null && trendPct !== '' ? (
                <span
                  className={`dashboard-summary-trend-pct ${trendPositive === false ? 'dashboard-summary-trend-neg' : ''}`}
                >
                  {trendPositive === false ? '↓' : '↑'} {trendPct}
                </span>
              ) : null}
              {trendLabel ? <span className="dashboard-summary-trend-label">{trendLabel}</span> : null}
            </div>
          ) : null}
          {subtitle ? <p className="dashboard-summary-subtitle">{subtitle}</p> : null}
        </>
      )}
    </article>
  )
}
