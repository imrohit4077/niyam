import type { Application } from '../api/applications'
import type { InterviewAssignmentRow } from '../api/interviews'
import type { Job } from '../api/jobs'

export type TrendDirection = 'up' | 'down' | 'flat'

/** Percent change from prior to current; null if not meaningful. */
export function percentChange(current: number, prior: number): { pct: number | null; direction: TrendDirection } {
  if (prior === 0 && current === 0) return { pct: null, direction: 'flat' }
  if (prior === 0) return { pct: null, direction: current > 0 ? 'up' : 'flat' }
  const raw = Math.round(((current - prior) / prior) * 100)
  const direction: TrendDirection = raw > 0 ? 'up' : raw < 0 ? 'down' : 'flat'
  return { pct: raw, direction }
}

/** First application timestamp per candidate email. */
export function firstApplicationAtByEmail(applications: Application[]): Map<string, string> {
  const m = new Map<string, string>()
  for (const a of applications) {
    const email = a.candidate_email?.toLowerCase().trim()
    if (!email) continue
    const prev = m.get(email)
    if (!prev || a.created_at < prev) m.set(email, a.created_at)
  }
  return m
}

/** Count distinct emails with first application in [from, to). */
export function countNewCandidatesInRange(
  firstByEmail: Map<string, string>,
  from: Date,
  to: Date,
): number {
  const fromT = from.getTime()
  const toT = to.getTime()
  let n = 0
  for (const ts of firstByEmail.values()) {
    const t = new Date(ts).getTime()
    if (t >= fromT && t < toT) n += 1
  }
  return n
}

export function uniqueCandidateCount(applications: Application[]): number {
  const s = new Set<string>()
  for (const a of applications) {
    const email = a.candidate_email?.toLowerCase().trim()
    if (email) s.add(email)
  }
  return s.size
}

export function newOpenJobsInRange(jobs: Job[], from: Date, to: Date): number {
  const fromT = from.getTime()
  const toT = to.getTime()
  return jobs.filter(j => {
    if (j.status !== 'open') return false
    const t = new Date(j.created_at).getTime()
    return t >= fromT && t < toT
  }).length
}

export function interviewAssignmentsCreatedInRange(rows: InterviewAssignmentRow[], from: Date, to: Date): number {
  const fromT = from.getTime()
  const toT = to.getTime()
  return rows.filter(r => {
    const t = new Date(r.created_at).getTime()
    return t >= fromT && t < toT
  }).length
}

/** Interviews with scheduled_at in [from, to). */
export function interviewsScheduledInRange(rows: InterviewAssignmentRow[], from: Date, to: Date): number {
  const fromT = from.getTime()
  const toT = to.getTime()
  return rows.filter(r => {
    if (!r.scheduled_at) return false
    const t = new Date(r.scheduled_at).getTime()
    return t >= fromT && t < toT
  }).length
}

export function applicationsInStatusUpdatedInRange(
  applications: Application[],
  status: string,
  from: Date,
  to: Date,
): number {
  const fromT = from.getTime()
  const toT = to.getTime()
  return applications.filter(a => {
    if (a.status !== status) return false
    const t = new Date(a.updated_at).getTime()
    return t >= fromT && t < toT
  }).length
}

export type ActivityKind = 'candidate' | 'interview' | 'offer' | 'hire' | 'rejected' | 'application'

export type ActivityItem = {
  id: string
  at: string
  kind: ActivityKind
  title: string
  subtitle: string
}

function formatDashboardLabel(value: string) {
  return value.replace(/_/g, ' ').replace(/\b\w/g, ch => ch.toUpperCase())
}

export function buildActivityFeed(
  applications: Application[],
  interviews: InterviewAssignmentRow[],
  limit = 18,
): ActivityItem[] {
  const items: ActivityItem[] = []

  for (const a of applications) {
    const name = a.candidate_name || a.candidate_email || 'Candidate'
    const at = a.updated_at || a.created_at
    let kind: ActivityKind = 'application'
    let title = `${name} applied`
    if (a.status === 'hired') {
      kind = 'hire'
      title = `${name} marked hired`
    } else if (a.status === 'offer') {
      kind = 'offer'
      title = `${name} in offer stage`
    } else if (a.status === 'rejected' || a.status === 'withdrawn') {
      kind = 'rejected'
      title = `${name} ${a.status === 'withdrawn' ? 'withdrew' : 'rejected'}`
    } else if (a.status === 'interview' || a.status === 'screening') {
      kind = 'candidate'
      title = `${name} moved to ${formatDashboardLabel(a.status)}`
    }
    items.push({
      id: `app-${a.id}-${at}`,
      at,
      kind,
      title,
      subtitle: `Job #${a.job_id} · ${formatDashboardLabel(a.status)}`,
    })
  }

  for (const row of interviews) {
    const name = row.application?.candidate_name || row.application?.candidate_email || 'Candidate'
    const jobTitle = row.job?.title ?? 'Role'
    const at = row.scheduled_at || row.updated_at || row.created_at
    items.push({
      id: `int-${row.id}-${at}`,
      at,
      kind: 'interview',
      title: `Interview ${formatDashboardLabel(row.status)} — ${name}`,
      subtitle: jobTitle,
    })
  }

  items.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
  return items.slice(0, limit)
}

export const PIPELINE_FUNNEL_STAGES = ['applied', 'screening', 'interview', 'offer', 'hired'] as const

export type PipelineStage = (typeof PIPELINE_FUNNEL_STAGES)[number]

export function funnelCountsByStatus(applications: Application[]): number[] {
  const byStatus = applications.reduce<Record<string, number>>((acc, a) => {
    acc[a.status] = (acc[a.status] ?? 0) + 1
    return acc
  }, {})
  return PIPELINE_FUNNEL_STAGES.map(stage => byStatus[stage] ?? 0)
}

export function applicantsPerJob(applications: Application[], jobs: Job[], topN = 10) {
  const counts = new Map<number, number>()
  for (const a of applications) {
    counts.set(a.job_id, (counts.get(a.job_id) ?? 0) + 1)
  }
  const rows = jobs.map(job => ({
    jobId: job.id,
    title: job.title,
    count: counts.get(job.id) ?? 0,
  }))
  rows.sort((a, b) => b.count - a.count)
  return rows.slice(0, topN)
}

/** Primary pipeline stage for table: furthest stage in funnel the job has any candidate in. */
export function dominantPipelineStageForJob(applications: Application[], jobId: number): string {
  const apps = applications.filter(a => a.job_id === jobId)
  if (apps.length === 0) return '—'
  const order = [...PIPELINE_FUNNEL_STAGES].reverse()
  for (const stage of order) {
    if (apps.some(a => a.status === stage)) return formatDashboardLabel(stage)
  }
  const other = apps[0]?.status
  return other ? formatDashboardLabel(other) : '—'
}

/** Rolling comparison windows: current = last 14 days, prior = 14 days before that. */
export function hiringTrendWindows() {
  const currentTo = new Date()
  const currentFrom = new Date(currentTo)
  currentFrom.setDate(currentFrom.getDate() - 14)
  const priorTo = currentFrom
  const priorFrom = new Date(priorTo)
  priorFrom.setDate(priorFrom.getDate() - 14)
  return { currentFrom, currentTo, priorFrom, priorTo }
}
