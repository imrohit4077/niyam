import type { Application } from '../../api/applications'
import type { InterviewAssignmentRow } from '../../api/interviews'
import type { Job } from '../../api/jobs'
import type { DashboardActivityItem } from './DashboardActivityFeed'
import type { DashboardJobRow } from './DashboardJobsTable'
import type { SummaryTrendDirection } from './DashboardSummaryCard'

const MS_DAY = 86400000

const DASHBOARD_CHART_COLORS = ['#00b4d8', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#6b7280', '#8b5cf6']

export function formatDashboardLabel(value: string) {
  return value.replace(/_/g, ' ').replace(/\b\w/g, ch => ch.toUpperCase())
}

export type DashboardSlice = {
  key: string
  label: string
  value: number
  color: string
}

export function makeDashboardSlices(entries: Array<[string, number]>): DashboardSlice[] {
  return entries
    .filter(([, value]) => value > 0)
    .map(([label, value], index) => ({
      key: label,
      label: formatDashboardLabel(label),
      value,
      color: DASHBOARD_CHART_COLORS[index % DASHBOARD_CHART_COLORS.length],
    }))
}

/** Fixed pipeline order for funnel visualization */
export const PIPELINE_FUNNEL_STATUSES = ['applied', 'screening', 'interview', 'offer', 'hired'] as const

export type PipelineFunnelCounts = Record<(typeof PIPELINE_FUNNEL_STATUSES)[number], number>

export function countPipelineFunnel(applications: Application[]): PipelineFunnelCounts {
  const base: PipelineFunnelCounts = {
    applied: 0,
    screening: 0,
    interview: 0,
    offer: 0,
    hired: 0,
  }
  for (const app of applications) {
    const s = app.status as keyof PipelineFunnelCounts
    if (s in base) base[s] += 1
  }
  return base
}

export function applicantsPerJob(jobs: Job[], applications: Application[]): Map<number, number> {
  const map = new Map<number, number>()
  for (const j of jobs) map.set(j.id, 0)
  for (const app of applications) {
    map.set(app.job_id, (map.get(app.job_id) ?? 0) + 1)
  }
  return map
}

export function topStageLabelForJob(jobId: number, applications: Application[]): string | null {
  const forJob = applications.filter(a => a.job_id === jobId)
  if (forJob.length === 0) return null
  const counts = new Map<string, number>()
  for (const a of forJob) {
    counts.set(a.status, (counts.get(a.status) ?? 0) + 1)
  }
  let best = ''
  let bestN = 0
  for (const [status, n] of counts) {
    if (n > bestN) {
      best = status
      bestN = n
    }
  }
  return best ? formatDashboardLabel(best) : null
}

export function buildDashboardJobRows(jobs: Job[], applications: Application[]): DashboardJobRow[] {
  const perJob = applicantsPerJob(jobs, applications)
  return jobs.map(job => ({
    job,
    applicantCount: perJob.get(job.id) ?? 0,
    topStageLabel: topStageLabelForJob(job.id, applications),
  }))
}

function windowBounds() {
  const now = Date.now()
  const endCurrent = now
  const startCurrent = now - 30 * MS_DAY
  const endPrevious = startCurrent
  const startPrevious = startCurrent - 30 * MS_DAY
  return { startCurrent, endCurrent, startPrevious, endPrevious }
}

export function trendPercent30d(current: number, previous: number): { direction: SummaryTrendDirection; label: string } {
  if (previous === 0 && current === 0) return { direction: 'neutral', label: '→ 0%' }
  if (previous === 0) return { direction: 'up', label: `↑ ${current > 0 ? '100' : '0'}%` }
  const pct = Math.round(((current - previous) / previous) * 100)
  const direction: SummaryTrendDirection = pct > 0 ? 'up' : pct < 0 ? 'down' : 'neutral'
  const arrow = pct > 0 ? '↑' : pct < 0 ? '↓' : '→'
  return { direction, label: `${arrow} ${Math.abs(pct)}%` }
}

export function countApplicationsCreatedInRange(applications: Application[], start: number, end: number) {
  return applications.filter(a => {
    const t = new Date(a.created_at).getTime()
    return t >= start && t < end
  }).length
}

export function countOffersTouchedInRange(applications: Application[], start: number, end: number) {
  return applications.filter(a => {
    if (a.status !== 'offer') return false
    const t = new Date(a.updated_at).getTime()
    return t >= start && t < end
  }).length
}

export function countInterviewsScheduledInRange(rows: InterviewAssignmentRow[], start: number, end: number) {
  return rows.filter(r => {
    if (!r.scheduled_at) return false
    const t = new Date(r.scheduled_at).getTime()
    return t >= start && t < end
  }).length
}

/** Open roles with edits in the window (proxy for recruiting activity on active reqs). */
export function countOpenJobsTouchedInRange(jobs: Job[], start: number, end: number) {
  return jobs.filter(j => {
    if (j.status !== 'open') return false
    const t = new Date(j.updated_at).getTime()
    return t >= start && t < end
  }).length
}

export function buildActivityFeed(
  applications: Application[],
  interviews: InterviewAssignmentRow[],
  limit: number,
): DashboardActivityItem[] {
  type Raw = { id: string; at: string; title: string; subtitle: string }
  const raw: Raw[] = []

  for (const a of applications) {
    raw.push({
      id: `app-created-${a.id}`,
      at: a.created_at,
      title: 'Candidate applied',
      subtitle: `${a.candidate_name || a.candidate_email} · Application`,
    })
    if (a.status === 'hired') {
      raw.push({
        id: `app-hired-${a.id}`,
        at: a.updated_at,
        title: 'Candidate hired',
        subtitle: `${a.candidate_name || a.candidate_email}`,
      })
    }
  }

  for (const row of interviews) {
    if (row.scheduled_at) {
      raw.push({
        id: `int-${row.id}`,
        at: row.scheduled_at,
        title: 'Interview scheduled',
        subtitle: `${row.application?.candidate_name || row.application?.candidate_email || 'Candidate'}${row.job?.title ? ` · ${row.job.title}` : ''}`,
      })
    }
  }

  raw.sort((x, y) => new Date(y.at).getTime() - new Date(x.at).getTime())
  const seen = new Set<string>()
  const out: DashboardActivityItem[] = []
  for (const r of raw) {
    if (seen.has(r.id)) continue
    seen.add(r.id)
    out.push({ id: r.id, title: r.title, subtitle: r.subtitle, at: r.at })
    if (out.length >= limit) break
  }
  return out
}

export function workspaceSummaryTrends(
  applications: Application[],
  jobs: Job[],
  interviews: InterviewAssignmentRow[],
) {
  const { startCurrent, endCurrent, startPrevious, endPrevious } = windowBounds()

  const candidatesCurrent = countApplicationsCreatedInRange(applications, startCurrent, endCurrent)
  const candidatesPrevious = countApplicationsCreatedInRange(applications, startPrevious, endPrevious)

  const offersCurrent = countOffersTouchedInRange(applications, startCurrent, endCurrent)
  const offersPrevious = countOffersTouchedInRange(applications, startPrevious, endPrevious)

  const intCurrent = countInterviewsScheduledInRange(interviews, startCurrent, endCurrent)
  const intPrevious = countInterviewsScheduledInRange(interviews, startPrevious, endPrevious)

  const openCurrent = countOpenJobsTouchedInRange(jobs, startCurrent, endCurrent)
  const openPrevious = countOpenJobsTouchedInRange(jobs, startPrevious, endPrevious)

  return {
    candidates: trendPercent30d(candidatesCurrent, candidatesPrevious),
    offers: trendPercent30d(offersCurrent, offersPrevious),
    interviews: trendPercent30d(intCurrent, intPrevious),
    activeJobs: trendPercent30d(openCurrent, openPrevious),
  }
}
