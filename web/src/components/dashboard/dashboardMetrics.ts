import type { Application } from '../../api/applications'
import type { InterviewAssignmentRow } from '../../api/interviews'
import type { Job } from '../../api/jobs'
import type { TrendDirection } from './DashboardSummaryCard'

export type MonthBucket = { key: string; label: string; start: Date; end: Date }

/** Last `count` calendar months ending at `now`, oldest first. */
export function rollingMonthBuckets(now: Date, count: number): MonthBucket[] {
  const out: MonthBucket[] = []
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const start = new Date(d.getFullYear(), d.getMonth(), 1)
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const label = d.toLocaleDateString('en-US', { month: 'short' })
    out.push({ key, label, start, end })
  }
  return out
}

export function countInRange(iso: string, start: Date, end: Date) {
  const t = new Date(iso).getTime()
  return t >= start.getTime() && t <= end.getTime() ? 1 : 0
}

export function monthOverMonthPercent(current: number, previous: number): { pct: number; direction: TrendDirection } {
  if (previous === 0) {
    if (current === 0) return { pct: 0, direction: 'flat' }
    return { pct: 100, direction: 'up' }
  }
  const raw = ((current - previous) / previous) * 100
  const pct = Math.min(999, Math.round(Math.abs(raw)))
  if (raw > 0.5) return { pct, direction: 'up' }
  if (raw < -0.5) return { pct, direction: 'down' }
  return { pct: 0, direction: 'flat' }
}

export function applicationsCreatedInMonth(applications: Application[], bucket: MonthBucket) {
  return applications.reduce((n, a) => n + countInRange(a.created_at, bucket.start, bucket.end), 0)
}

export function jobsCreatedInMonth(jobs: Job[], bucket: MonthBucket) {
  return jobs.reduce((n, j) => n + countInRange(j.created_at, bucket.start, bucket.end), 0)
}

export function interviewsScheduledInMonth(rows: InterviewAssignmentRow[], bucket: MonthBucket) {
  return rows.reduce((n, r) => {
    if (!r.scheduled_at) return n
    return n + countInRange(r.scheduled_at, bucket.start, bucket.end)
  }, 0)
}

export function offersTouchedInMonth(applications: Application[], bucket: MonthBucket) {
  return applications.reduce((n, a) => {
    if (a.status !== 'offer') return n
    return n + countInRange(a.updated_at, bucket.start, bucket.end)
  }, 0)
}

export type ActivityItem = {
  id: string
  title: string
  subtitle: string
  at: string
  kind: 'application' | 'interview' | 'job'
}

export function buildActivityFeed(
  applications: Application[],
  interviews: InterviewAssignmentRow[],
  jobs: Job[],
  limit: number,
): ActivityItem[] {
  const fromApps: ActivityItem[] = applications.map(a => ({
    id: `app-${a.id}`,
    title: `Candidate ${a.candidate_name?.trim() || a.candidate_email} applied`,
    subtitle: `Application • ${formatDashboardStatus(a.status)}`,
    at: a.created_at,
    kind: 'application' as const,
  }))

  const fromInterviews: ActivityItem[] = interviews.map(r => ({
    id: `int-${r.id}`,
    title: r.scheduled_at
      ? `Interview scheduled${r.application?.candidate_name ? ` — ${r.application.candidate_name}` : ''}`
      : `Interview ${formatDashboardStatus(r.status)}`,
    subtitle: r.job?.title ? r.job.title : 'Interview',
    at: r.scheduled_at || r.updated_at,
    kind: 'interview' as const,
  }))

  const fromJobs: ActivityItem[] = jobs.map(j => ({
    id: `job-${j.id}`,
    title: `Job published: ${j.title}`,
    subtitle: formatDashboardStatus(j.status),
    at: j.published_at || j.created_at,
    kind: 'job' as const,
  }))

  return [...fromApps, ...fromInterviews, ...fromJobs]
    .filter(x => x.at)
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .slice(0, limit)
}

function formatDashboardStatus(value: string) {
  return value.replace(/_/g, ' ').replace(/\b\w/g, ch => ch.toUpperCase())
}

export function dominantApplicationStatusForJob(applications: Application[], jobId: number): string {
  const rows = applications.filter(a => a.job_id === jobId)
  if (rows.length === 0) return '—'
  const counts: Record<string, number> = {}
  for (const r of rows) {
    counts[r.status] = (counts[r.status] ?? 0) + 1
  }
  let best = rows[0].status
  let bestN = 0
  for (const [k, v] of Object.entries(counts)) {
    if (v > bestN) {
      best = k
      bestN = v
    }
  }
  return formatDashboardStatus(best)
}
