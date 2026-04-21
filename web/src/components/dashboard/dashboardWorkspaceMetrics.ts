import type { Application } from '../../api/applications'
import type { InterviewAssignmentRow } from '../../api/interviews'
import type { Job } from '../../api/jobs'

export const PIPELINE_FUNNEL_STAGES = ['applied', 'screening', 'interview', 'offer', 'hired'] as const

export type PipelineFunnelStage = (typeof PIPELINE_FUNNEL_STAGES)[number]

export function countByStatus(applications: Application[], statuses: readonly string[]): Record<string, number> {
  const acc: Record<string, number> = {}
  for (const s of statuses) acc[s] = 0
  for (const a of applications) {
    if (acc[a.status] !== undefined) acc[a.status] += 1
  }
  return acc
}

export function workspaceFunnelCounts(applications: Application[]): number[] {
  const by = countByStatus(applications, PIPELINE_FUNNEL_STAGES)
  return PIPELINE_FUNNEL_STAGES.map(s => by[s] ?? 0)
}

export type JobApplicantRow = {
  jobId: number
  title: string
  count: number
  /** Dominant stage label among applicants for this job */
  topStage: string
}

function dominantStage(statuses: string[]): string {
  const order = ['hired', 'offer', 'interview', 'screening', 'applied', 'rejected', 'withdrawn']
  for (const s of order) {
    if (statuses.some(x => x === s)) return s
  }
  return statuses[0] ?? '—'
}

/** Human-readable dominant pipeline stage for a job's applicants (for tables). */
export function summarizeDominantStage(applicationsForJob: Application[]): string {
  if (applicationsForJob.length === 0) return '—'
  const counts: Record<string, number> = {}
  for (const a of applicationsForJob) counts[a.status] = (counts[a.status] ?? 0) + 1
  const stage = dominantStage(Object.keys(counts))
  return formatStageLabel(stage)
}

export function jobWiseApplicantDistribution(
  jobs: Job[],
  applications: Application[],
  limit = 8,
): JobApplicantRow[] {
  const byJob: Record<number, Application[]> = {}
  for (const a of applications) {
    if (!byJob[a.job_id]) byJob[a.job_id] = []
    byJob[a.job_id].push(a)
  }
  const rows: JobApplicantRow[] = jobs.map(job => {
    const list = byJob[job.id] ?? []
    const counts: Record<string, number> = {}
    for (const a of list) counts[a.status] = (counts[a.status] ?? 0) + 1
    const topStage = dominantStage(Object.keys(counts))
    return { jobId: job.id, title: job.title, count: list.length, topStage }
  })
  return rows.sort((a, b) => b.count - a.count).slice(0, limit)
}

export type ActivityKind = 'application' | 'interview' | 'stage' | 'hire'

export type ActivityFeedItem = {
  id: string
  kind: ActivityKind
  title: string
  subtitle: string
  at: string
  applicationId?: number
}

export function buildActivityFeed(
  applications: Application[],
  interviews: InterviewAssignmentRow[],
  maxItems = 12,
): ActivityFeedItem[] {
  const recentApps = [...applications]
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    .slice(0, 48)

  const items: ActivityFeedItem[] = []

  for (const a of recentApps) {
    items.push({
      id: `app-${a.id}`,
      kind: 'application',
      title: `Candidate added: ${a.candidate_name || a.candidate_email}`,
      subtitle: `Application • ${formatStageLabel(a.status)}`,
      at: a.created_at,
      applicationId: a.id,
    })
    const lastStage = a.stage_history?.length ? a.stage_history[a.stage_history.length - 1] : null
    if (lastStage && lastStage.changed_at !== a.created_at && lastStage.stage !== 'applied') {
      items.push({
        id: `stage-${a.id}-${lastStage.changed_at}`,
        kind: 'stage',
        title: `Pipeline update: ${a.candidate_name || a.candidate_email}`,
        subtitle: `Moved to ${formatStageLabel(lastStage.stage)}`,
        at: lastStage.changed_at,
        applicationId: a.id,
      })
    }
    if (a.status === 'hired') {
      items.push({
        id: `hire-${a.id}`,
        kind: 'hire',
        title: `Hired: ${a.candidate_name || a.candidate_email}`,
        subtitle: 'Offer accepted',
        at: a.updated_at,
        applicationId: a.id,
      })
    }
  }

  for (const row of interviews) {
    if (row.scheduled_at && (row.status === 'scheduled' || row.status === 'pending')) {
      const name = row.application?.candidate_name || row.application?.candidate_email || 'Candidate'
      items.push({
        id: `int-${row.id}`,
        kind: 'interview',
        title: `Interview scheduled: ${name}`,
        subtitle: row.job?.title ? `With ${row.job.title}` : 'Interview',
        at: row.scheduled_at,
        applicationId: row.application?.id,
      })
    }
  }

  items.sort((x, y) => new Date(y.at).getTime() - new Date(x.at).getTime())
  const seen = new Set<string>()
  const deduped: ActivityFeedItem[] = []
  for (const it of items) {
    if (seen.has(it.id)) continue
    seen.add(it.id)
    deduped.push(it)
    if (deduped.length >= maxItems) break
  }
  return deduped
}

function formatStageLabel(s: string) {
  return s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

type WindowCount = { current: number; previous: number }

export function countInDateWindows(
  dates: Array<string | null | undefined>,
  currentStart: Date,
  currentEnd: Date,
  previousStart: Date,
  previousEnd: Date,
): WindowCount {
  let current = 0
  let previous = 0
  for (const raw of dates) {
    if (!raw) continue
    const t = new Date(raw).getTime()
    if (t >= currentStart.getTime() && t <= currentEnd.getTime()) current += 1
    else if (t >= previousStart.getTime() && t <= previousEnd.getTime()) previous += 1
  }
  return { current, previous }
}

export function trendFromWindows(w: WindowCount): { direction: 'up' | 'down' | 'flat'; percent: number } {
  if (w.previous === 0 && w.current === 0) return { direction: 'flat', percent: 0 }
  if (w.previous === 0) return { direction: 'up', percent: 100 }
  const pct = Math.round(((w.current - w.previous) / w.previous) * 100)
  if (pct > 0) return { direction: 'up', percent: pct }
  if (pct < 0) return { direction: 'down', percent: Math.abs(pct) }
  return { direction: 'flat', percent: 0 }
}
