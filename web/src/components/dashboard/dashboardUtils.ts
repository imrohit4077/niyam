import type { Application } from '../../api/applications'
import type { InterviewAssignmentRow } from '../../api/interviews'
import type { Job } from '../../api/jobs'

export const DASHBOARD_CHART_COLORS = ['#00b4d8', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#6b7280', '#8b5cf6']

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

export function formatDashboardLabel(value: string) {
  return value.replace(/_/g, ' ').replace(/\b\w/g, ch => ch.toUpperCase())
}

export function formatDateTimeShort(value: string | null) {
  if (!value) return 'Not scheduled'
  return new Date(value).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function formatRelativeTime(iso: string) {
  const d = new Date(iso)
  const diff = Date.now() - d.getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}d ago`
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

/** Count items whose date field falls in [start, end). */
export function countInRange<T>(items: T[], getDate: (item: T) => string | null, start: Date, end: Date) {
  return items.filter(item => {
    const raw = getDate(item)
    if (!raw) return false
    const t = new Date(raw).getTime()
    return t >= start.getTime() && t < end.getTime()
  }).length
}

export function trendVsPriorPeriod(current: number, previous: number): { direction: 'up' | 'down' | 'flat'; pct: number } {
  if (previous === 0) {
    if (current === 0) return { direction: 'flat', pct: 0 }
    return { direction: 'up', pct: 100 }
  }
  const raw = ((current - previous) / previous) * 100
  const pct = Math.round(Math.abs(raw))
  if (raw > 0.5) return { direction: 'up', pct }
  if (raw < -0.5) return { direction: 'down', pct }
  return { direction: 'flat', pct: 0 }
}

export const PIPELINE_FUNNEL_STAGES = ['applied', 'screening', 'interview', 'offer', 'hired'] as const
export type PipelineFunnelStage = (typeof PIPELINE_FUNNEL_STAGES)[number]

export function funnelCountsFromApplications(applications: Application[]) {
  return PIPELINE_FUNNEL_STAGES.map(stage => applications.filter(a => a.status === stage).length)
}

export function applicantsPerJob(applications: Application[], jobs: Job[]) {
  const byJob = applications.reduce<Record<number, number>>((acc, a) => {
    acc[a.job_id] = (acc[a.job_id] ?? 0) + 1
    return acc
  }, {})
  return jobs
    .map(job => ({
      job,
      count: byJob[job.id] ?? 0,
    }))
    .filter(row => row.count > 0)
    .sort((a, b) => b.count - a.count)
}

export type ActivityItem = {
  id: string
  kind: 'application' | 'interview' | 'offer' | 'hired'
  title: string
  subtitle: string
  at: string
}

export function buildActivityFeed(
  applications: Application[],
  interviews: InterviewAssignmentRow[],
  limit = 12,
): ActivityItem[] {
  const items: ActivityItem[] = []

  applications.forEach(app => {
    items.push({
      id: `app-${app.id}`,
      kind: 'application',
      title: 'Application received',
      subtitle: `${app.candidate_name || app.candidate_email} · ${formatDashboardLabel(app.status)}`,
      at: app.created_at,
    })
  })

  interviews.forEach(row => {
    if (row.scheduled_at && (row.status === 'scheduled' || row.status === 'pending')) {
      items.push({
        id: `int-${row.id}`,
        kind: 'interview',
        title: 'Interview scheduled',
        subtitle: `${row.application?.candidate_name || row.application?.candidate_email || 'Candidate'} · ${row.job?.title ?? 'Job'}`,
        at: row.scheduled_at,
      })
    }
  })

  items.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
  return items.slice(0, limit)
}

export function modeApplicationStatus(applications: Application[]): string | null {
  if (applications.length === 0) return null
  const counts = applications.reduce<Record<string, number>>((acc, a) => {
    acc[a.status] = (acc[a.status] ?? 0) + 1
    return acc
  }, {})
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1])
  return sorted[0]?.[0] ?? null
}

export function modeApplicationStatusForJob(jobId: number, applications: Application[]) {
  return modeApplicationStatus(applications.filter(a => a.job_id === jobId))
}
