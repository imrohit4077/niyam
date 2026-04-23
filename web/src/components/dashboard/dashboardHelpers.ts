import type { Application } from '../../api/applications'
import type { InterviewAssignmentRow } from '../../api/interviews'
import type { Job } from '../../api/jobs'

export const FUNNEL_STAGES = ['applied', 'screening', 'interview', 'offer', 'hired'] as const
export type FunnelStage = (typeof FUNNEL_STAGES)[number]

const FUNNEL_RANK: Record<string, number> = {
  applied: 1,
  screening: 2,
  interview: 3,
  offer: 4,
  hired: 5,
}

export function formatDashboardLabel(value: string) {
  return value.replace(/_/g, ' ').replace(/\b\w/g, ch => ch.toUpperCase())
}

/** Highest funnel stage this application has reached (from history + current). */
export function funnelDepth(application: Application): number {
  const stages = new Set<string>()
  stages.add(application.status)
  application.stage_history?.forEach(h => {
    if (h.stage) stages.add(h.stage)
  })
  let max = 0
  stages.forEach(s => {
    const r = FUNNEL_RANK[s]
    if (r != null && r > max) max = r
  })
  return max
}

/** Cumulative counts: how many candidates have reached at least each funnel stage. */
export function workspaceFunnelCounts(applications: Application[]): number[] {
  const depths = applications.map(funnelDepth)
  return FUNNEL_STAGES.map((_, idx) => depths.filter(d => d >= idx + 1).length)
}

export type TrendDirection = 'up' | 'down' | 'flat' | 'neutral'

export type TrendResult = {
  direction: TrendDirection
  label: string
}

/** Month-over-month % change for items dated in calendar months (via ISO timestamps). */
export function monthOverMonthTrend(
  items: { dateIso: string }[],
  now: Date = new Date(),
): TrendResult {
  const y = now.getFullYear()
  const m = now.getMonth()
  const thisStart = new Date(y, m, 1).getTime()
  const prevStart = new Date(y, m - 1, 1).getTime()
  const prevEnd = thisStart
  let thisMonth = 0
  let lastMonth = 0
  for (const { dateIso } of items) {
    const t = new Date(dateIso).getTime()
    if (t >= thisStart) thisMonth += 1
    else if (t >= prevStart && t < prevEnd) lastMonth += 1
  }
  if (lastMonth === 0 && thisMonth === 0) return { direction: 'neutral', label: 'No recent change' }
  if (lastMonth === 0) return { direction: 'up', label: 'New this month' }
  const pct = Math.round(((thisMonth - lastMonth) / lastMonth) * 100)
  const direction: TrendDirection = pct > 0 ? 'up' : pct < 0 ? 'down' : 'flat'
  const sign = pct > 0 ? '+' : ''
  return { direction, label: `${sign}${pct}% vs prior month` }
}

export function forwardWindowTrend(
  dated: { at: string | null }[],
  now: Date = new Date(),
  firstDays: number,
  secondDays: number,
): TrendResult {
  const start = now.getTime()
  const aEnd = start + firstDays * 86400000
  const bEnd = start + (firstDays + secondDays) * 86400000
  let first = 0
  let second = 0
  for (const { at } of dated) {
    if (!at) continue
    const t = new Date(at).getTime()
    if (t >= start && t < aEnd) first += 1
    else if (t >= aEnd && t < bEnd) second += 1
  }
  if (first === 0 && second === 0) return { direction: 'neutral', label: 'No upcoming window' }
  if (second === 0) return { direction: first > 0 ? 'up' : 'neutral', label: 'Next 14d vs following' }
  const pct = Math.round(((first - second) / second) * 100)
  const direction: TrendDirection = pct > 0 ? 'up' : pct < 0 ? 'down' : 'flat'
  const sign = pct > 0 ? '+' : ''
  return { direction, label: `${sign}${pct}% next ${firstDays}d vs next ${secondDays}d` }
}

export type ActivityItem = {
  id: string
  title: string
  meta: string
  at: string
  kind: 'application' | 'interview' | 'stage'
}

const STAGE_VERB: Record<string, string> = {
  applied: 'Applied',
  screening: 'Moved to screening',
  interview: 'In interview',
  offer: 'Offer stage',
  hired: 'Hired',
  rejected: 'Rejected',
  withdrawn: 'Withdrawn',
}

export function buildActivityFeed(
  applications: Application[],
  interviews: InterviewAssignmentRow[],
  jobs: Job[],
  limit = 12,
): ActivityItem[] {
  const jobTitle = (jobId: number) => jobs.find(j => j.id === jobId)?.title ?? `Job #${jobId}`
  const rows: ActivityItem[] = []

  for (const app of applications) {
    const name = app.candidate_name || app.candidate_email
    rows.push({
      id: `app-${app.id}`,
      title: `${name} applied`,
      meta: jobTitle(app.job_id),
      at: app.created_at,
      kind: 'application',
    })
    const lastHist = app.stage_history?.length
      ? app.stage_history[app.stage_history.length - 1]
      : null
    if (lastHist && lastHist.changed_at && lastHist.stage !== 'applied') {
      const verb = STAGE_VERB[lastHist.stage] ?? `Stage: ${formatDashboardLabel(lastHist.stage)}`
      rows.push({
        id: `stage-${app.id}-${lastHist.changed_at}`,
        title: `${name} — ${verb}`,
        meta: 'Pipeline update',
        at: lastHist.changed_at,
        kind: 'stage',
      })
    }
  }

  for (const row of interviews) {
    const cand = row.application?.candidate_name || row.application?.candidate_email || 'Candidate'
    const jobTitle = row.job?.title ?? 'Role'
    if (row.scheduled_at) {
      rows.push({
        id: `int-${row.id}`,
        title: `Interview scheduled — ${cand}`,
        meta: `${jobTitle}`,
        at: row.scheduled_at,
        kind: 'interview',
      })
    }
  }

  rows.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
  return rows.slice(0, limit)
}

export function dominantApplicantStage(job: Job, applications: Application[]): string {
  const forJob = applications.filter(a => a.job_id === job.id)
  if (forJob.length === 0) return '—'
  const counts: Record<string, number> = {}
  for (const a of forJob) {
    counts[a.status] = (counts[a.status] ?? 0) + 1
  }
  let best = ''
  let bestN = 0
  for (const [k, v] of Object.entries(counts)) {
    if (v > bestN) {
      best = k
      bestN = v
    }
  }
  return formatDashboardLabel(best)
}

export function applicantCountForJob(jobId: number, applications: Application[]): number {
  return applications.filter(a => a.job_id === jobId).length
}
