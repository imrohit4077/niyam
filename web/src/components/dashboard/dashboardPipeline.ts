import type { Application } from '../../api/applications'

/** Canonical funnel stages for workspace-level reporting */
export const PIPELINE_FUNNEL_STAGES = ['applied', 'screening', 'interview', 'offer', 'hired'] as const
export type PipelineFunnelStage = (typeof PIPELINE_FUNNEL_STAGES)[number]

const STAGE_ORDER: Record<string, number> = {
  applied: 0,
  screening: 1,
  interview: 2,
  offer: 3,
  hired: 4,
}

function stageIndex(stage: string): number {
  return STAGE_ORDER[stage] ?? -1
}

/** Furthest funnel stage this application has reached (from history + current status). */
export function maxFunnelStageIndex(application: Application): number {
  let max = stageIndex(application.status)
  for (const ev of application.stage_history ?? []) {
    const idx = stageIndex(ev.stage)
    if (idx > max) max = idx
  }
  return max
}

/**
 * Cumulative funnel counts: bucket *i* counts applications whose furthest reached stage
 * is at least that step (non-increasing funnel toward the right).
 */
export function buildWorkspaceFunnelCounts(applications: Application[]): number[] {
  const counts = PIPELINE_FUNNEL_STAGES.map(() => 0)
  for (const app of applications) {
    const maxIdx = maxFunnelStageIndex(app)
    for (let i = 0; i < counts.length; i++) {
      if (maxIdx >= i) counts[i] += 1
    }
  }
  return counts
}
