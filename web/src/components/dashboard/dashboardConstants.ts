/** Ordered funnel stages for workspace-wide pipeline visualization */
export const PIPELINE_FUNNEL_STAGES = ['applied', 'screening', 'interview', 'offer', 'hired'] as const

export type PipelineFunnelStage = (typeof PIPELINE_FUNNEL_STAGES)[number]

export const DASHBOARD_CHART_COLORS = [
  '#0ea5e9',
  '#3b82f6',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#6b7280',
  '#8b5cf6',
] as const

export const DASHBOARD_BRAND_LINE = '#0ea5e9'
export const DASHBOARD_BRAND_FILL = 'rgba(14, 165, 233, 0.15)'
