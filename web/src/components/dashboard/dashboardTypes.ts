export type ActivityKind = 'application' | 'interview' | 'offer' | 'hire'

export type DashboardActivityItem = {
  id: string
  kind: ActivityKind
  title: string
  subtitle: string
  at: string
}

export type TrendDirection = 'up' | 'down' | 'flat'

export type KpiTrend = {
  direction: TrendDirection
  percent: number
  /** Short label, e.g. "vs prior 30 days" */
  label: string
}

export type SummaryKpi = {
  id: string
  label: string
  value: number | string
  icon: 'users' | 'briefcase' | 'calendar' | 'gift'
  trend: KpiTrend
  hint?: string
}
