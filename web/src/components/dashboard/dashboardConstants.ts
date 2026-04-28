export const STAGE_COLORS: Record<string, string> = {
  applied: 'tag-blue',
  screening: 'tag-orange',
  interview: 'tag-blue',
  offer: 'tag-green',
  hired: 'tag-green',
  rejected: 'tag-red',
  withdrawn: 'tag-gray',
  draft: 'tag-gray',
  open: 'tag-green',
  closed: 'tag-gray',
  paused: 'tag-orange',
  pending: 'tag-orange',
  scheduled: 'tag-blue',
  completed: 'tag-green',
  cancelled: 'tag-gray',
}

export const DASHBOARD_CHART_COLORS = [
  '#0ea5e9',
  '#3b82f6',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#6b7280',
  '#8b5cf6',
]

/** Canonical funnel stages for workspace pipeline chart */
export const WORKSPACE_FUNNEL_STATUSES = ['applied', 'screening', 'interview', 'offer', 'hired'] as const

export const PRIMARY_CHART = '#0ea5e9'
export const PRIMARY_CHART_SOFT = 'rgba(14, 165, 233, 0.16)'
