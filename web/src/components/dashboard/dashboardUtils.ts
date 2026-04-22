import type { Application } from '../../api/applications'
import type { InterviewAssignmentRow } from '../../api/interviews'
import type { Job } from '../../api/jobs'

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

export type TrendDirection = 'up' | 'down' | 'flat'

export function trendFromValues(current: number, previous: number): { direction: TrendDirection; pct: number } {
  if (previous === 0 && current === 0) return { direction: 'flat', pct: 0 }
  if (previous === 0) return { direction: 'up', pct: 100 }
  const raw = ((current - previous) / previous) * 100
  const pct = Math.round(Math.abs(raw))
  if (Math.abs(raw) < 0.5) return { direction: 'flat', pct: 0 }
  return { direction: raw >= 0 ? 'up' : 'down', pct }
}

/** Count items whose timestamp falls in [start, end), relative to `anchorMs` (typically latest data timestamp). */
export function rollingWindowTrend(
  items: { at: string }[],
  daysEach = 30,
  anchorMs: number | null,
): { direction: TrendDirection; pct: number } {
  if (anchorMs == null || !Number.isFinite(anchorMs)) return { direction: 'flat', pct: 0 }
  const now = anchorMs
  const ms = daysEach * 86400000
  const recentStart = now - ms
  const prevStart = now - 2 * ms
  let recent = 0
  let prev = 0
  for (const { at } of items) {
    const t = new Date(at).getTime()
    if (t >= recentStart) recent++
    else if (t >= prevStart && t < recentStart) prev++
  }
  return trendFromValues(recent, prev)
}

/** Monotonic funnel: Applied ≥ Screening ≥ Interview ≥ Offer ≥ Hired (selected job applications). */
export function pipelineFunnelCounts(applications: Application[]) {
  const total = applications.length
  const screeningOrLater = applications.filter(a =>
    ['screening', 'interview', 'offer', 'hired'].includes(a.status),
  ).length
  const interviewOrLater = applications.filter(a => ['interview', 'offer', 'hired'].includes(a.status)).length
  const offerOrLater = applications.filter(a => ['offer', 'hired'].includes(a.status)).length
  const hired = applications.filter(a => a.status === 'hired').length
  return {
    labels: ['Applied', 'Screening', 'Interview', 'Offer', 'Hired'],
    values: [total, screeningOrLater, interviewOrLater, offerOrLater, hired],
  }
}

export function applicantsPerJob(jobs: Job[], applications: Application[], topN = 8) {
  const counts = new Map<number, { title: string; count: number }>()
  for (const job of jobs) {
    counts.set(job.id, { title: job.title, count: 0 })
  }
  for (const app of applications) {
    const row = counts.get(app.job_id)
    if (row) row.count += 1
  }
  return [...counts.values()]
    .filter(r => r.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, topN)
}

export type ActivityItem = {
  id: string
  kind: string
  title: string
  subtitle: string
  at: string
}

export function buildActivityFeed(
  applications: Application[],
  interviews: InterviewAssignmentRow[],
  maxItems: number,
): ActivityItem[] {
  const items: ActivityItem[] = []

  const appsSorted = [...applications].sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
  for (const app of appsSorted.slice(0, 40)) {
    const name = app.candidate_name || app.candidate_email
    items.push({
      id: `app-${app.id}`,
      kind: 'application',
      title: `Candidate activity: ${name}`,
      subtitle: `${formatDashboardLabel(app.status)}`,
      at: app.updated_at,
    })
  }

  for (const row of interviews) {
    const name = row.application?.candidate_name || row.application?.candidate_email || 'Candidate'
    const jobTitle = row.job?.title ?? 'Job'
    items.push({
      id: `int-${row.id}`,
      kind: 'interview',
      title: `Interview ${formatDashboardLabel(row.status)}`,
      subtitle: `${name} · ${jobTitle}`,
      at: row.scheduled_at || row.updated_at,
    })
  }

  items.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
  return items.slice(0, maxItems)
}

/** Approximate "offer" events for trending (stage history when present, else single bump when status is offer). */
export function offerTimelineEntries(applications: Application[]): { at: string }[] {
  const out: { at: string }[] = []
  for (const app of applications) {
    const hist = app.stage_history ?? []
    let found = false
    for (const h of hist) {
      if (h.stage === 'offer') {
        out.push({ at: h.changed_at })
        found = true
      }
    }
    if (!found && app.status === 'offer') {
      out.push({ at: app.updated_at })
    }
  }
  return out
}

export function dominantPipelineStage(jobApplications: Application[]): string {
  const byStatus = jobApplications.reduce<Record<string, number>>((acc, a) => {
    acc[a.status] = (acc[a.status] ?? 0) + 1
    return acc
  }, {})
  let best = ''
  let bestN = 0
  for (const [k, v] of Object.entries(byStatus)) {
    if (v > bestN) {
      best = k
      bestN = v
    }
  }
  return best ? formatDashboardLabel(best) : '—'
}
