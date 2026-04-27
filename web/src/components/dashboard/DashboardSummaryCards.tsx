import type { ReactNode } from 'react'

export type SummaryTrend = {
  direction: 'up' | 'down' | 'flat'
  /** Human-readable, e.g. "12%" or "3" */
  label: string
}

type SummaryCardProps = {
  title: string
  value: number | string
  icon: ReactNode
  trend?: SummaryTrend
  subtitle?: string
  primary?: boolean
}

export function DashboardSummaryCard({ title, value, icon, trend, subtitle, primary }: SummaryCardProps) {
  const trendArrow = trend?.direction === 'up' ? '↑' : trend?.direction === 'down' ? '↓' : '→'
  const trendClass =
    trend?.direction === 'up'
      ? 'dashboard-kpi-trend--up'
      : trend?.direction === 'down'
        ? 'dashboard-kpi-trend--down'
        : 'dashboard-kpi-trend--flat'

  return (
    <article className={`dashboard-kpi-card dashboard-kpi-card--rich${primary ? ' dashboard-kpi-primary' : ''}`}>
      <div className="dashboard-kpi-card-top">
        <span className="dashboard-kpi-card-label">{title}</span>
        <span className={`dashboard-kpi-icon-wrap${primary ? ' dashboard-kpi-icon-wrap--on-primary' : ''}`} aria-hidden>
          {icon}
        </span>
      </div>
      <div className="dashboard-kpi-card-value-row">
        <strong>{value}</strong>
        {trend && (
          <span className={`dashboard-kpi-trend ${trendClass}`} title="Compared to previous 30 days">
            <span className="dashboard-kpi-trend-arrow" aria-hidden>
              {trendArrow}
            </span>
            <span>{trend.label}</span>
          </span>
        )}
      </div>
      {subtitle ? <p>{subtitle}</p> : null}
    </article>
  )
}

/** Skeleton placeholders for the four summary cards while jobs load. */
export function DashboardSummaryCardsSkeleton() {
  return (
    <div className="dashboard-kpi-grid dashboard-kpi-grid--four">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="dashboard-kpi-card dashboard-kpi-skeleton-card" aria-hidden>
          <div className="dashboard-kpi-skeleton-line dashboard-kpi-skeleton-line--short" />
          <div className="dashboard-kpi-skeleton-line dashboard-kpi-skeleton-line--value" />
          <div className="dashboard-kpi-skeleton-line dashboard-kpi-skeleton-line--muted" />
        </div>
      ))}
    </div>
  )
}

type SummaryCardsGridProps = {
  totalCandidates: number
  candidateTrend?: SummaryTrend
  activeJobs: number
  jobsTrend?: SummaryTrend
  interviewsScheduled: number
  interviewTrend?: SummaryTrend
  offersReleased: number
  offerTrend?: SummaryTrend
  loading: boolean
  icons: {
    candidates: ReactNode
    jobs: ReactNode
    interviews: ReactNode
    offers: ReactNode
  }
}

export function DashboardSummaryCardsGrid({
  totalCandidates,
  candidateTrend,
  activeJobs,
  jobsTrend,
  interviewsScheduled,
  interviewTrend,
  offersReleased,
  offerTrend,
  loading,
  icons,
}: SummaryCardsGridProps) {
  if (loading) {
    return <DashboardSummaryCardsSkeleton />
  }

  return (
    <div className="dashboard-kpi-grid dashboard-kpi-grid--four">
      <DashboardSummaryCard
        title="Total candidates"
        value={totalCandidates}
        icon={icons.candidates}
        trend={candidateTrend}
        subtitle="Unique applicants across all jobs"
        primary
      />
      <DashboardSummaryCard title="Active jobs" value={activeJobs} icon={icons.jobs} trend={jobsTrend} subtitle="Open requisitions" />
      <DashboardSummaryCard
        title="Interviews scheduled"
        value={interviewsScheduled}
        icon={icons.interviews}
        trend={interviewTrend}
        subtitle="Pending or scheduled slots"
      />
      <DashboardSummaryCard title="Offers released" value={offersReleased} icon={icons.offers} trend={offerTrend} subtitle="Applications in offer stage" />
    </div>
  )
}
