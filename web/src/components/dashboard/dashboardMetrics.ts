import type { Application } from '../../api/applications'
import type { AuditLogEntry } from '../../api/auditLog'
import type { Job } from '../../api/jobs'

export const PIPELINE_FUNNEL_STAGES = ['applied', 'screening', 'interview', 'offer', 'hired'] as const

export type PipelineStage = (typeof PIPELINE_FUNNEL_STAGES)[number]

export function formatDashboardLabel(value: string) {
  return value.replace(/_/g, ' ').replace(/\b\w/g, ch => ch.toUpperCase())
}

export type TrendResult = {
  recent: number
  previous: number
  pct: number | null
  direction: 'up' | 'down' | 'flat'
}

export function computeDateWindowTrend(
  dates: Array<string | null | undefined>,
  recentDays: number,
  previousDays: number,
): TrendResult {
  const now = Date.now()
  const recentStart = now - recentDays * 86400000
  const previousEnd = recentStart
  const previousStart = previousEnd - previousDays * 86400000

  let recent = 0
  let previous = 0
  for (const raw of dates) {
    if (!raw) continue
    const t = new Date(raw).getTime()
    if (Number.isNaN(t)) continue
    if (t >= recentStart && t <= now) recent += 1
    else if (t >= previousStart && t < previousEnd) previous += 1
  }

  let pct: number | null = null
  if (previous > 0) pct = Math.round(((recent - previous) / previous) * 100)
  else if (recent > 0) pct = 100
  else pct = 0

  let direction: TrendResult['direction'] = 'flat'
  if (recent > previous) direction = 'up'
  else if (recent < previous) direction = 'down'

  return { recent, previous, pct, direction }
}

export function formatTrendLabel(t: TrendResult): string {
  if (t.pct === null) return '—'
  const sign = t.pct > 0 ? '+' : ''
  return `${sign}${t.pct}%`
}

export function funnelCountsFromApplications(applications: Application[]): Record<PipelineStage, number> {
  const base: Record<PipelineStage, number> = {
    applied: 0,
    screening: 0,
    interview: 0,
    offer: 0,
    hired: 0,
  }
  for (const app of applications) {
    const s = app.status as string
    if (s in base) base[s as PipelineStage] += 1
  }
  return base
}

export type ActivityItem = {
  id: string
  title: string
  detail: string
  at: string
}

export function buildActivityFeedFromApplications(applications: Application[], limit: number): ActivityItem[] {
  const items: ActivityItem[] = []
  const sorted = [...applications].sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())

  for (const app of sorted) {
    if (items.length >= limit) break
    const name = app.candidate_name || app.candidate_email
    const last = app.stage_history?.length ? app.stage_history[app.stage_history.length - 1] : null
    if (last?.changed_at) {
      items.push({
        id: `app-${app.id}-stage`,
        title: `${name} → ${formatDashboardLabel(last.stage)}`,
        detail: 'Pipeline update',
        at: last.changed_at,
      })
      continue
    }
    items.push({
      id: `app-${app.id}-created`,
      title: `Candidate added: ${name}`,
      detail: formatDashboardLabel(app.status),
      at: app.created_at,
    })
  }

  return items.slice(0, limit)
}

export function mergeActivityWithAudit(
  primary: ActivityItem[],
  auditEntries: AuditLogEntry[],
  limit: number,
): ActivityItem[] {
  const auditItems: ActivityItem[] = auditEntries
    .filter(e => e.created_at && (e.action || e.resource))
    .map(e => ({
      id: `audit-${e.id}`,
      title: e.action || e.resource || 'Workspace activity',
      detail: e.actor_display || e.path || 'Audit log',
      at: e.created_at as string,
    }))

  const merged = [...primary, ...auditItems].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())

  const seen = new Set<string>()
  const out: ActivityItem[] = []
  for (const row of merged) {
    if (seen.has(row.id)) continue
    seen.add(row.id)
    out.push(row)
    if (out.length >= limit) break
  }
  return out
}

export function dominantPipelineStage(jobApplications: Application[]): string {
  const counts = jobApplications.reduce<Record<string, number>>((acc, a) => {
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
  return best ? formatDashboardLabel(best) : '—'
}

export function applicantsPerJob(jobs: Job[], applications: Application[], topN = 8) {
  const byJob = applications.reduce<Record<number, number>>((acc, a) => {
    acc[a.job_id] = (acc[a.job_id] ?? 0) + 1
    return acc
  }, {})
  const rows = jobs.map(job => ({
    jobId: job.id,
    title: job.title,
    count: byJob[job.id] ?? 0,
  }))
  rows.sort((a, b) => b.count - a.count)
  const top = rows.slice(0, topN)
  const rest = rows.slice(topN)
  const other = rest.reduce((s, r) => s + r.count, 0)
  if (other > 0) {
    top.push({ jobId: -1, title: 'Other', count: other })
  }
  return top
}

export function jobTableRows(jobs: Job[], applications: Application[]) {
  const counts = applications.reduce<Record<number, number>>((acc, a) => {
    acc[a.job_id] = (acc[a.job_id] ?? 0) + 1
    return acc
  }, {})
  return jobs.map(job => ({
    job,
    applicants: counts[job.id] ?? 0,
    stage: dominantPipelineStage(applications.filter(a => a.job_id === job.id)),
  }))
}
