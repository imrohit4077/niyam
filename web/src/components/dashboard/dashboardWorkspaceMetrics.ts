import type { Application } from '../../api/applications'
import type { InterviewAssignmentRow } from '../../api/interviews'
/** Ordered funnel stages for workspace-level pipeline visualization. */
export const WORKSPACE_FUNNEL_STAGES = ['applied', 'screening', 'interview', 'offer', 'hired'] as const

export type WorkspaceFunnelStage = (typeof WORKSPACE_FUNNEL_STAGES)[number]

export function formatDashboardStageLabel(stage: string) {
  return stage.replace(/_/g, ' ').replace(/\b\w/g, ch => ch.toUpperCase())
}

export function countApplicationsInCalendarMonth(
  applications: Application[],
  year: number,
  monthIndexZeroBased: number,
  predicate: (app: Application) => boolean,
  dateField: 'created_at' | 'updated_at' = 'created_at',
) {
  return applications.filter(app => {
    if (!predicate(app)) return false
    const d = new Date(app[dateField])
    return d.getFullYear() === year && d.getMonth() === monthIndexZeroBased
  }).length
}

export function countInterviewsScheduledInMonth(
  rows: InterviewAssignmentRow[],
  year: number,
  monthIndexZeroBased: number,
) {
  return rows.filter(row => {
    const raw = row.scheduled_at || row.created_at
    if (!raw) return false
    const d = new Date(raw)
    return d.getFullYear() === year && d.getMonth() === monthIndexZeroBased
  }).length
}

/** Percent change; null if comparison is not meaningful. */
export function percentChange(current: number, previous: number): number | null {
  if (previous === 0 && current === 0) return null
  if (previous === 0) return null
  return Math.round(((current - previous) / previous) * 100)
}

export function workspaceFunnelCounts(applications: Application[]): Record<WorkspaceFunnelStage, number> {
  const base: Record<WorkspaceFunnelStage, number> = {
    applied: 0,
    screening: 0,
    interview: 0,
    offer: 0,
    hired: 0,
  }
  for (const app of applications) {
    const s = app.status as string
    if (s in base) base[s as WorkspaceFunnelStage] += 1
  }
  return base
}

export function dominantPipelineStageForJob(jobId: number, applications: Application[]): string {
  const counts: Record<string, number> = {}
  for (const app of applications) {
    if (app.job_id !== jobId) continue
    counts[app.status] = (counts[app.status] ?? 0) + 1
  }
  let best = ''
  let bestN = 0
  for (const [k, v] of Object.entries(counts)) {
    if (v > bestN) {
      best = k
      bestN = v
    }
  }
  return best
}

export type ActivityFeedItem = {
  id: string
  at: string
  title: string
  detail: string
  href: string | null
}

const TERMINAL_APP_STATUSES = new Set(['hired', 'offer', 'rejected', 'withdrawn'])

export function buildActivityFeed(
  applications: Application[],
  interviews: InterviewAssignmentRow[],
  accountId: string,
  limit = 14,
): ActivityFeedItem[] {
  type Row = ActivityFeedItem & { t: number }
  const rows: Row[] = []

  for (const app of applications) {
    const name = app.candidate_name || app.candidate_email || 'Candidate'
    rows.push({
      id: `app-created-${app.id}`,
      at: app.created_at,
      t: new Date(app.created_at).getTime(),
      title: 'Candidate applied',
      detail: `${name} · Job #${app.job_id}`,
      href: `/account/${accountId}/job-applications/${app.id}`,
    })
    if (TERMINAL_APP_STATUSES.has(app.status)) {
      const t = new Date(app.updated_at).getTime()
      const createdT = new Date(app.created_at).getTime()
      if (t > createdT + 1000) {
        rows.push({
          id: `app-outcome-${app.id}`,
          at: app.updated_at,
          t,
          title: `Application ${formatDashboardStageLabel(app.status)}`,
          detail: `${name} · Job #${app.job_id}`,
          href: `/account/${accountId}/job-applications/${app.id}`,
        })
      }
    }
  }

  for (const inv of interviews) {
    const name =
      inv.application?.candidate_name || inv.application?.candidate_email || 'Candidate'
    const jobTitle = inv.job?.title ?? `Job #${inv.application?.job_id ?? '—'}`
    if (inv.scheduled_at) {
      rows.push({
        id: `inv-sched-${inv.id}`,
        at: inv.scheduled_at,
        t: new Date(inv.scheduled_at).getTime(),
        title: 'Interview scheduled',
        detail: `${name} · ${jobTitle}`,
        href: `/account/${accountId}/interviews`,
      })
    }
  }

  rows.sort((a, b) => b.t - a.t)
  const seen = new Set<string>()
  const out: ActivityFeedItem[] = []
  for (const r of rows) {
    if (seen.has(r.id)) continue
    seen.add(r.id)
    out.push({ id: r.id, at: r.at, title: r.title, detail: r.detail, href: r.href })
    if (out.length >= limit) break
  }
  return out
}
