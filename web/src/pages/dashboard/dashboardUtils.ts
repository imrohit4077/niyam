import type { Application } from '../../api/applications'
import type { InterviewAssignmentRow } from '../../api/interviews'
import type { Job } from '../../api/jobs'
import { PIPELINE_FUNNEL_STAGES } from './dashboardConstants'

export function formatDashboardLabel(value: string) {
  return value.replace(/_/g, ' ').replace(/\b\w/g, ch => ch.toUpperCase())
}

export function formatRelativeTime(iso: string) {
  const d = new Date(iso)
  const now = Date.now()
  const diffMs = now - d.getTime()
  const mins = Math.floor(diffMs / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}d ago`
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

/** Count items whose date field falls in [start, end) */
export function countInRange<T>(items: T[], getDate: (item: T) => string | null, start: Date, end: Date) {
  const t0 = start.getTime()
  const t1 = end.getTime()
  return items.filter(item => {
    const raw = getDate(item)
    if (!raw) return false
    const t = new Date(raw).getTime()
    return t >= t0 && t < t1
  }).length
}

export type TrendResult = {
  current: number
  previous: number
  delta: number
  percent: number | null
  direction: 'up' | 'down' | 'flat'
}

export function computeTrend(current: number, previous: number): TrendResult {
  const delta = current - previous
  let percent: number | null = null
  if (previous > 0) percent = Math.round((delta / previous) * 100)
  else if (current > 0 && previous === 0) percent = null
  else percent = 0
  const direction: TrendResult['direction'] = delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat'
  return { current, previous, delta, percent, direction }
}

export function formatTrendLabel(t: TrendResult): string {
  if (t.direction === 'flat') return '0%'
  if (t.percent === null) return '—'
  const sign = t.delta > 0 ? '+' : ''
  return `${sign}${t.percent}%`
}

export function funnelCountsByStatus(applications: Application[]) {
  const map = PIPELINE_FUNNEL_STAGES.reduce<Record<string, number>>((acc, s) => {
    acc[s] = 0
    return acc
  }, {})
  for (const a of applications) {
    const s = a.status
    if (s in map) map[s] += 1
  }
  return PIPELINE_FUNNEL_STAGES.map(stage => ({ stage, label: formatDashboardLabel(stage), count: map[stage] ?? 0 }))
}

export function applicantsPerJob(jobs: Job[], applications: Application[]) {
  const byJob = applications.reduce<Record<number, number>>((acc, a) => {
    acc[a.job_id] = (acc[a.job_id] ?? 0) + 1
    return acc
  }, {})
  return jobs
    .map(job => ({
      id: job.id,
      title: job.title,
      count: byJob[job.id] ?? 0,
    }))
    .sort((a, b) => b.count - a.count)
}

export type ActivityKind = 'application' | 'interview' | 'stage' | 'job'

export type ActivityItem = {
  id: string
  kind: ActivityKind
  title: string
  subtitle: string
  at: string
  href?: string
}

export function buildActivityFeed(
  applications: Application[],
  interviews: InterviewAssignmentRow[],
  jobs: Job[],
  accountId: string,
): ActivityItem[] {
  const jobTitle = (jobId: number) => jobs.find(j => j.id === jobId)?.title ?? `Job #${jobId}`

  const fromApps: ActivityItem[] = applications.map(a => ({
    id: `app-${a.id}`,
    kind: 'application' as const,
    title: `Candidate added`,
    subtitle: `${a.candidate_name || a.candidate_email} · ${jobTitle(a.job_id)}`,
    at: a.created_at,
    href: `/account/${accountId}/applications/${a.id}`,
  }))

  const fromInterviews: ActivityItem[] = interviews
    .filter(row => row.scheduled_at && (row.status === 'scheduled' || row.status === 'pending'))
    .map(row => ({
      id: `int-${row.id}`,
      kind: 'interview' as const,
      title: 'Interview scheduled',
      subtitle: `${row.application?.candidate_name || row.application?.candidate_email || 'Candidate'} · ${row.job?.title ?? (row.application?.job_id != null ? jobTitle(row.application.job_id) : 'Job')}`,
      at: row.scheduled_at!,
      href: `/account/${accountId}/interviews`,
    }))

  /** One latest pipeline transition per application to keep the feed readable */
  const stageEvents: ActivityItem[] = []
  for (const a of applications) {
    const hist = a.stage_history ?? []
    if (hist.length === 0) continue
    const h = hist[hist.length - 1]
    stageEvents.push({
      id: `stage-${a.id}-${h.changed_at}-${h.stage}`,
      kind: 'stage',
      title: `Moved to ${formatDashboardLabel(h.stage)}`,
      subtitle: `${a.candidate_name || a.candidate_email} · ${jobTitle(a.job_id)}`,
      at: h.changed_at,
      href: `/account/${accountId}/applications/${a.id}`,
    })
  }

  const fromJobs: ActivityItem[] = jobs.map(j => ({
    id: `job-${j.id}`,
    kind: 'job' as const,
    title: 'Job created',
    subtitle: j.title,
    at: j.created_at,
    href: `/account/${accountId}/jobs/${j.id}/edit`,
  }))

  return [...fromApps, ...fromInterviews, ...stageEvents, ...fromJobs]
    .sort((x, y) => new Date(y.at).getTime() - new Date(x.at).getTime())
    .slice(0, 24)
}

/** Dominant pipeline stage among open jobs (by applicant volume) */
export function dominantStageForJob(jobId: number, applications: Application[]) {
  const counts = applications
    .filter(a => a.job_id === jobId)
    .reduce<Record<string, number>>((acc, a) => {
      acc[a.status] = (acc[a.status] ?? 0) + 1
      return acc
    }, {})
  let best = ''
  let max = 0
  for (const [k, v] of Object.entries(counts)) {
    if (v > max) {
      max = v
      best = k
    }
  }
  if (max === 0) return '—'
  return best ? formatDashboardLabel(best) : '—'
}
