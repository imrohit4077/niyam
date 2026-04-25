/** Brand-aligned chart palette (teal primary, neutrals). */
export const DASHBOARD_CHART_COLORS = [
  '#0ea5e9',
  '#3b82f6',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#64748b',
  '#8b5cf6',
  '#14b8a6',
] as const

/** Canonical funnel stages for workspace pipeline visualization. */
export const FUNNEL_STAGE_KEYS = ['applied', 'screening', 'interview', 'offer', 'hired'] as const

export type FunnelStageKey = (typeof FUNNEL_STAGE_KEYS)[number]
