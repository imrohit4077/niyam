/** Shared Chart.js / dashboard palette — aligns with Niyam teal + neutrals */
export const DASHBOARD_CHART_COLORS = [
  '#0ea5e9',
  '#3b82f6',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#64748b',
  '#8b5cf6',
] as const

export const DASHBOARD_BRAND_LINE = '#0ea5e9'
export const DASHBOARD_BRAND_FILL = 'rgba(14, 165, 233, 0.12)'

export const FUNNEL_STAGE_ORDER = ['applied', 'screening', 'interview', 'offer', 'hired'] as const
export type FunnelStage = (typeof FUNNEL_STAGE_ORDER)[number]
