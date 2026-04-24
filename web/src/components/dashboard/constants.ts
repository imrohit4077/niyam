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
  '#00b4d8',
  '#3b82f6',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#6b7280',
  '#8b5cf6',
]

/** Primary brand for charts and accents */
export const DASHBOARD_BRAND = '#0ea5e9'
export const DASHBOARD_BRAND_LINE = '#0284c7'

/** Cumulative funnel order (widest → narrowest) */
export const PIPELINE_FUNNEL_LABELS = ['Applied', 'Screening', 'Interview', 'Offer', 'Hired'] as const
