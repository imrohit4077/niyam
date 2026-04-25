import type { Application } from '../../api/applications'
import type { InterviewAssignmentRow } from '../../api/interviews'
import type { Job } from '../../api/jobs'

export type TrendDirection = 'up' | 'down' | 'flat'

export type TrendResult = {
  direction: TrendDirection
  /** e.g. "+12%" or "0%" */
  label: string
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
  const diffMs = Date.now() - d.getTime()
  const mins = Math.floor(diffMs / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}d ago`
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

/** Month-over-month percent change; returns label like "+8%" or "—" when not meaningful. */
export function monthOverMonthPercent(current: number, previous: number): TrendResult {
  if (previous === 0 && current === 0) return { direction: 'flat', label: '0%' }
  if (previous === 0) return { direction: 'up', label: '+100%' }
  const pct = Math.round(((current - previous) / previous) * 100)
  if (pct === 0) return { direction: 'flat', label: '0%' }
  if (pct > 0) return { direction: 'up', label: `+${pct}%` }
  return { direction: 'down', label: `${pct}%` }
}

export function simpleDeltaPercent(current: number, baseline: number): TrendResult {
  if (baseline <= 0) {
    if (current > 0) return { direction: 'up', label: 'new' }
    return { direction: 'flat', label: '—' }
  }
  const pct = Math.round(((current - baseline) / baseline) * 100)
  if (pct === 0) return { direction: 'flat', label: '0%' }
  if (pct > 0) return { direction: 'up', label: `+${pct}%` }
  return { direction: 'down', label: `${pct}%` }
}

const FUNNEL_STATUSES = ['applied', 'screening', 'interview', 'offer', 'hired'] as const

export type FunnelStep = { key: string; label: string; count: number }

export function buildWorkspaceFunnelCounts(applications: Application[]): FunnelStep[] {
  const byStatus = applications.reduce<Record<string, number>>((acc, a) => {
    acc[a.status] = (acc[a.status] ?? 0) + 1
    return acc
  }, {})
  return FUNNEL_STATUSES.map(key => ({
    key,
    label: formatDashboardLabel(key),
    count: byStatus[key] ?? 0,
  }))
}

export type ActivityItem = {
  id: string
  title: string
  meta: string
  /** Short relative label for display */
  timeLabel: string
}

export function buildActivityFeed(
  applications: Application[],
  interviews: InterviewAssignmentRow[],
  opts?: { jobTitleById?: Record<number, string>; limit?: number },
): ActivityItem[] {
  const limit = opts?.limit ?? 12
  const jobTitle = (jobId: number) => opts?.jobTitleById?.[jobId] ?? `Job #${jobId}`
  type Raw = { at: number; item: ActivityItem }
  const rows: Raw[] = []

  for (const a of applications) {
    const name = a.candidate_name || a.candidate_email || 'Candidate'
    rows.push({
      at: new Date(a.created_at).getTime(),
      item: {
        id: `app-created-${a.id}`,
        title: `Application received: ${name}`,
        meta: `New applicant · ${jobTitle(a.job_id)}`,
        timeLabel: formatRelativeTime(a.created_at),
      },
    })
    if (a.stage_history?.length) {
      const last = a.stage_history[a.stage_history.length - 1]
      if (last?.changed_at) {
        rows.push({
          at: new Date(last.changed_at).getTime(),
          item: {
            id: `app-stage-${a.id}-${last.changed_at}`,
            title: `Stage updated: ${name}`,
            meta: `${jobTitle(a.job_id)} · ${formatDashboardLabel(last.stage)}`,
            timeLabel: formatRelativeTime(last.changed_at),
          },
        })
      }
    }
  }

  for (const row of interviews) {
    const name = row.application?.candidate_name || row.application?.candidate_email || 'Candidate'
    const jobTitle = row.job?.title ?? `Job #${row.application?.job_id ?? '—'}`
    rows.push({
      at: new Date(row.updated_at).getTime(),
      item: {
        id: `int-${row.id}-${row.updated_at}`,
        title: `Interview ${formatDashboardLabel(row.status)}: ${name}`,
        meta: jobTitle,
        timeLabel: formatRelativeTime(row.updated_at),
      },
    })
  }

  rows.sort((x, y) => y.at - x.at)
  const seen = new Set<string>()
  const out: ActivityItem[] = []
  for (const r of rows) {
    if (seen.has(r.item.id)) continue
    seen.add(r.item.id)
    out.push(r.item)
    if (out.length >= limit) break
  }
  return out
}

export function dominantApplicantStage(job: Job, applications: Application[]): string {
  const forJob = applications.filter(a => a.job_id === job.id)
  if (forJob.length === 0) return '—'
  const counts = forJob.reduce<Record<string, number>>((acc, a) => {
    acc[a.status] = (acc[a.status] ?? 0) + 1
    return acc
  }, {})
  let best = ''
  let n = 0
  for (const [status, c] of Object.entries(counts)) {
    if (c > n) {
      n = c
      best = status
    }
  }
  return formatDashboardLabel(best)
}
