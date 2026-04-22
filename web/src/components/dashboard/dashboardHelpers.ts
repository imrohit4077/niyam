import type { Application } from '../../api/applications'
import type { InterviewAssignmentRow } from '../../api/interviews'
import type { Job } from '../../api/jobs'
import type { AuditLogEntry } from '../../api/auditLog'

export const PIPELINE_FUNNEL_STAGES = ['applied', 'screening', 'interview', 'offer', 'hired'] as const

export type PipelineStage = (typeof PIPELINE_FUNNEL_STAGES)[number]

export function rolling30dWindows(now = new Date()) {
  const end = now.getTime()
  const d30 = 30 * 24 * 60 * 60 * 1000
  const currentStart = new Date(end - d30)
  const previousStart = new Date(end - 2 * d30)
  const previousEnd = currentStart
  return { currentStart, previousStart, previousEnd }
}

export function countApplicationsCreatedInRange(apps: Application[], rangeStart: Date, rangeEnd: Date) {
  return apps.filter(a => {
    const t = new Date(a.created_at).getTime()
    return t >= rangeStart.getTime() && t < rangeEnd.getTime()
  }).length
}

export function countOpenJobsCreatedInRange(jobs: Job[], rangeStart: Date, rangeEnd: Date) {
  return jobs.filter(j => {
    if (j.status !== 'open') return false
    const t = new Date(j.created_at).getTime()
    return t >= rangeStart.getTime() && t < rangeEnd.getTime()
  }).length
}

export function countInterviewsCreatedInRange(rows: InterviewAssignmentRow[], rangeStart: Date, rangeEnd: Date) {
  return rows.filter(r => {
    const t = new Date(r.created_at).getTime()
    return t >= rangeStart.getTime() && t < rangeEnd.getTime()
  }).length
}

export function countOffersByUpdatedRange(apps: Application[], rangeStart: Date, rangeEnd: Date) {
  return apps.filter(a => {
    if (a.status !== 'offer') return false
    const t = new Date(a.updated_at).getTime()
    return t >= rangeStart.getTime() && t < rangeEnd.getTime()
  }).length
}

export function aggregatePipelineCounts(apps: Application[], stages: readonly PipelineStage[]) {
  return stages.map(stage => apps.filter(a => a.status === stage).length)
}

export function applicantsPerJob(apps: Application[], jobIds: number[]) {
  const map = new Map<number, number>()
  for (const id of jobIds) map.set(id, 0)
  for (const a of apps) {
    map.set(a.job_id, (map.get(a.job_id) ?? 0) + 1)
  }
  return map
}

export function topApplicantStageForJob(apps: Application[], jobId: number): string | null {
  const subset = apps.filter(a => a.job_id === jobId)
  if (subset.length === 0) return null
  const priority: string[] = ['hired', 'offer', 'interview', 'screening', 'applied']
  for (const st of priority) {
    if (subset.some(a => a.status === st)) return st
  }
  const first = subset[0]?.status
  return first ?? null
}

export type ActivityItem = {
  id: string
  at: string
  title: string
  subtitle: string
}

export function buildSyntheticActivityFeed(params: {
  applications: Application[]
  interviews: InterviewAssignmentRow[]
  jobs: Job[]
  max?: number
}): ActivityItem[] {
  const max = params.max ?? 10
  const items: ActivityItem[] = []

  for (const a of params.applications) {
    const name = a.candidate_name || a.candidate_email || 'Candidate'
    items.push({
      id: `app-${a.id}`,
      at: a.created_at,
      title: `Application received`,
      subtitle: `${name}`,
    })
  }

  for (const row of params.interviews) {
    const cand = row.application?.candidate_name || row.application?.candidate_email || 'Candidate'
    const jobTitle = row.job?.title ?? 'Role'
    if (row.scheduled_at) {
      items.push({
        id: `int-${row.id}-sched`,
        at: row.scheduled_at,
        title: 'Interview scheduled',
        subtitle: `${cand} · ${jobTitle}`,
      })
    } else {
      items.push({
        id: `int-${row.id}`,
        at: row.created_at,
        title: 'Interview assignment',
        subtitle: `${cand} · ${jobTitle}`,
      })
    }
  }

  for (const j of params.jobs) {
    items.push({
      id: `job-${j.id}`,
      at: j.created_at,
      title: j.status === 'open' ? 'Job opened' : 'Job created',
      subtitle: j.title,
    })
  }

  items.sort((x, y) => new Date(y.at).getTime() - new Date(x.at).getTime())
  const seen = new Set<string>()
  const deduped: ActivityItem[] = []
  for (const it of items) {
    const key = `${it.title}|${it.subtitle}|${it.at.slice(0, 16)}`
    if (seen.has(key)) continue
    seen.add(key)
    deduped.push(it)
    if (deduped.length >= max) break
  }
  return deduped
}

export function auditEntriesToActivity(entries: AuditLogEntry[], max: number): ActivityItem[] {
  const out: ActivityItem[] = []
  for (const row of entries) {
    if (!row.created_at) continue
    const m = row.metadata || {}
    const summary =
      (typeof m.summary === 'string' && m.summary.trim()) ||
      (row.action && String(row.action)) ||
      'Workspace activity'
    const feature =
      (typeof m.feature_label === 'string' && m.feature_label.trim()) || row.resource || ''
    out.push({
      id: `audit-${row.id}`,
      at: row.created_at,
      title: summary,
      subtitle: feature || 'Account',
    })
    if (out.length >= max) break
  }
  return out
}
