const funnelStageOrder = ['applied', 'screening', 'interview', 'offer', 'hired'] as const

export const PIPELINE_FUNNEL_LABELS = ['Applied', 'Screening', 'Interview', 'Offer', 'Hired'] as const

export function countFunnelByStatus(statusCounts: Record<string, number>) {
  return funnelStageOrder.map(key => statusCounts[key] ?? 0)
}
