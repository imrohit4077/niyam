import type { Application } from '../../api/applications'
import type { InterviewAssignmentRow } from '../../api/interviews'
import type { Job } from '../../api/jobs'

/** Canonical funnel stages for workspace-wide pipeline visualization. */
export const PIPELINE_FUNNEL_STAGES = ['applied', 'screening', 'interview', 'offer', 'hired'] as const

export type PipelineFunnelStage = (typeof PIPELINE_FUNNEL_STAGES)[number]

export type MonthlyTrendPoint = { key: string; label: string; value: number }

export function buildMonthlyTrend(allApplications: Application[], months = 6): MonthlyTrendPoint[] {
  const now = new Date()
  const keys = Array.from({ length: months }, (_, idx) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (months - 1 - idx), 1)
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    const label = date.toLocaleDateString('en-US', { month: 'short' })
    return { key, label }
  })
  const counters = keys.reduce<Record<string, number>>((acc, item) => {
    acc[item.key] = 0
    return acc
  }, {})
  allApplications.forEach(application => {
    const date = new Date(application.created_at)
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    if (key in counters) counters[key] += 1
  })
  return keys.map(item => ({ key: item.key, label: item.label, value: counters[item.key] ?? 0 }))
}

/** Percent change from previous to current bucket (e.g. month-over-month). */
export function percentChange(prev: number, curr: number): number | null {
  if (prev <= 0 && curr <= 0) return null
  if (prev <= 0) return 100
  return ((curr - prev) / prev) * 100
}

const FUNNEL_ORDER: Record<PipelineFunnelStage, number> = {
  applied: 0,
  screening: 1,
  interview: 2,
  offer: 3,
  hired: 4,
}

export function funnelStageIndex(status: string | undefined | null): number | null {
  if (!status) return null
  if (status in FUNNEL_ORDER) return FUNNEL_ORDER[status as PipelineFunnelStage]
  return null
}

/** Deepest known funnel stage for a job's applicants (by current status only). */
export function dominantPipelineStageLabel(apps: Application[], jobId: number, formatLabel: (s: string) => string): string {
  const list = apps.filter(a => a.job_id === jobId)
  if (list.length === 0) return '—'
  let best = list[0].status
  let bestScore = funnelStageIndex(list[0].status) ?? -1
  for (const a of list) {
    const sc = funnelStageIndex(a.status) ?? -1
    if (sc > bestScore) {
      bestScore = sc
      best = a.status
    }
  }
  return formatLabel(best)
}

/**
 * Cumulative funnel: each stage counts candidates who reached at least that depth,
 * using current status and `stage_history`. Applications never tagged with a funnel
 * stage are skipped.
 */
export function workspacePipelineFunnelCounts(allApplications: Application[]): Record<PipelineFunnelStage, number> {
  const atLeast = [0, 0, 0, 0, 0]

  for (const a of allApplications) {
    let maxIdx = funnelStageIndex(a.status) ?? -1
    for (const h of a.stage_history ?? []) {
      const idx = funnelStageIndex(h.stage)
      if (idx != null) maxIdx = Math.max(maxIdx, idx)
    }

    if (maxIdx < 0) continue

    for (let i = 0; i <= maxIdx && i < atLeast.length; i++) {
      atLeast[i] += 1
    }
  }

  return {
    applied: atLeast[0] ?? 0,
    screening: atLeast[1] ?? 0,
    interview: atLeast[2] ?? 0,
    offer: atLeast[3] ?? 0,
    hired: atLeast[4] ?? 0,
  }
}

export function applicantsPerJob(jobs: Job[], allApplications: Application[]): { jobId: number; title: string; count: number }[] {
  const byJob = allApplications.reduce<Record<number, number>>((acc, app) => {
    acc[app.job_id] = (acc[app.job_id] ?? 0) + 1
    return acc
  }, {})
  return jobs.map(job => ({
    jobId: job.id,
    title: job.title,
    count: byJob[job.id] ?? 0,
  }))
}

export function workspaceSourceCounts(allApplications: Application[]): Record<string, number> {
  return allApplications.reduce<Record<string, number>>((acc, application) => {
    const source = application.source_type || 'unknown'
    acc[source] = (acc[source] ?? 0) + 1
    return acc
  }, {})
}

export function countScheduledInterviews(rows: InterviewAssignmentRow[]): number {
  return rows.filter(row => row.status === 'scheduled' || row.status === 'pending' || !!row.scheduled_at).length
}

export function countOffersReleased(allApplications: Application[]): number {
  return allApplications.filter(a => a.status === 'offer').length
}
