import type { Application } from '../../api/applications'
import type { InterviewAssignmentRow } from '../../api/interviews'
import type { Job } from '../../api/jobs'
import type { KpiTrend } from './DashboardKpiCard'
import { FUNNEL_STAGE_ORDER } from './dashboardConstants'

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

function countBetween<T>(items: T[], getTime: (item: T) => string | null | undefined, start: number, end: number) {
  let n = 0
  for (const item of items) {
    const raw = getTime(item)
    if (!raw) continue
    const t = new Date(raw).getTime()
    if (t >= start && t < end) n += 1
  }
  return n
}

export function trendFromCounts(current: number, previous: number): KpiTrend {
  if (previous === 0 && current === 0) return { direction: 'flat', label: '0%' }
  if (previous === 0) return { direction: 'up', label: 'New' }
  const pct = Math.round(((current - previous) / previous) * 100)
  if (pct === 0) return { direction: 'flat', label: '0%' }
  if (pct > 0) return { direction: 'up', label: `+${pct}%` }
  return { direction: 'down', label: `${pct}%` }
}

export function applicationsTrendInWindows(
  applications: Application[],
  getDate: (a: Application) => string,
  days = 7,
) {
  const now = Date.now()
  const ms = days * 86400000
  const cur = countBetween(applications, a => getDate(a), now - ms, now)
  const prev = countBetween(applications, a => getDate(a), now - 2 * ms, now - ms)
  return trendFromCounts(cur, prev)
}

export function openJobsTrend(jobs: Job[], days = 30) {
  const now = Date.now()
  const ms = days * 86400000
  const cur = countBetween(
    jobs.filter(j => j.status === 'open'),
    j => j.created_at,
    now - ms,
    now,
  )
  const prev = countBetween(
    jobs.filter(j => j.status === 'open'),
    j => j.created_at,
    now - 2 * ms,
    now - ms,
  )
  return trendFromCounts(cur, prev)
}

export function interviewsScheduledTrend(rows: InterviewAssignmentRow[], days = 7) {
  const now = Date.now()
  const ms = days * 86400000
  const scheduled = rows.filter(
    r => r.status === 'scheduled' || r.status === 'pending' || !!r.scheduled_at,
  )
  const cur = countBetween(scheduled, r => r.scheduled_at ?? r.created_at, now - ms, now)
  const prev = countBetween(scheduled, r => r.scheduled_at ?? r.created_at, now - 2 * ms, now - ms)
  return trendFromCounts(cur, prev)
}

export function offersReleasedTrend(applications: Application[], days = 7) {
  const now = Date.now()
  const ms = days * 86400000
  const offers = applications.filter(a => a.status === 'offer')
  const cur = countBetween(offers, a => a.updated_at, now - ms, now)
  const prev = countBetween(offers, a => a.updated_at, now - 2 * ms, now - ms)
  return trendFromCounts(cur, prev)
}

export type ActivityItem = {
  id: string
  at: string
  title: string
  subtitle: string
}

export function buildActivityFeed(
  applications: Application[],
  interviews: InterviewAssignmentRow[],
  jobById: Map<number, Job>,
  limit = 12,
): ActivityItem[] {
  const items: ActivityItem[] = []

  const appsRecent = [...applications]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 400)
  const intRecent = [...interviews].slice(0, 120)

  for (const app of appsRecent) {
    const jobTitle = jobById.get(app.job_id)?.title ?? `Job #${app.job_id}`
    items.push({
      id: `app-created-${app.id}`,
      at: app.created_at,
      title: 'New application',
      subtitle: `${app.candidate_name || app.candidate_email} · ${jobTitle}`,
    })
    const history = app.stage_history ?? []
    if (history.length > 1) {
      const last = history[history.length - 1]
      if (last?.changed_at && last.changed_at !== app.created_at) {
        items.push({
          id: `app-stage-${app.id}-${last.changed_at}`,
          at: last.changed_at,
          title: `Stage → ${formatDashboardLabel(last.stage)}`,
          subtitle: `${app.candidate_name || app.candidate_email} · ${jobTitle}`,
        })
      }
    }
  }

  for (const row of intRecent) {
    const jobTitle = row.job?.title ?? (row.application?.job_id ? jobById.get(row.application.job_id)?.title : null) ?? 'Interview'
    const name = row.application?.candidate_name || row.application?.candidate_email || 'Candidate'
    if (row.scheduled_at) {
      items.push({
        id: `int-sched-${row.id}`,
        at: row.scheduled_at,
        title: 'Interview scheduled',
        subtitle: `${name} · ${jobTitle}`,
      })
    } else if (row.status === 'scheduled' || row.status === 'pending') {
      items.push({
        id: `int-pend-${row.id}`,
        at: row.updated_at,
        title: `Interview ${formatDashboardLabel(row.status)}`,
        subtitle: `${name} · ${jobTitle}`,
      })
    }
  }

  items.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
  const seen = new Set<string>()
  const deduped: ActivityItem[] = []
  for (const it of items) {
    if (seen.has(it.id)) continue
    seen.add(it.id)
    deduped.push(it)
    if (deduped.length >= limit) break
  }
  return deduped
}

export function funnelCountsFromApplications(applications: Application[]) {
  return FUNNEL_STAGE_ORDER.map(stage => ({
    stage,
    label: formatDashboardLabel(stage),
    count: applications.filter(a => a.status === stage).length,
  }))
}

export function applicantsPerJob(applications: Application[], jobs: Job[], topN = 8) {
  const counts = new Map<number, number>()
  for (const a of applications) {
    counts.set(a.job_id, (counts.get(a.job_id) ?? 0) + 1)
  }
  const rows = jobs
    .map(job => ({ job, n: counts.get(job.id) ?? 0 }))
    .filter(r => r.n > 0)
    .sort((a, b) => b.n - a.n)
    .slice(0, topN)
  return rows
}

export function dominantPipelineStage(job: Job, applications: Application[]): string {
  const forJob = applications.filter(a => a.job_id === job.id)
  if (forJob.length === 0) return '—'
  const tallies: Record<string, number> = {}
  for (const a of forJob) {
    tallies[a.status] = (tallies[a.status] ?? 0) + 1
  }
  let best = ''
  let bestN = -1
  for (const [k, v] of Object.entries(tallies)) {
    if (v > bestN) {
      best = k
      bestN = v
    }
  }
  return formatDashboardLabel(best)
}
