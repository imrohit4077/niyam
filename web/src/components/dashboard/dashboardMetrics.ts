import type { Application } from '../../api/applications'
import type { InterviewAssignmentRow } from '../../api/interviews'
import type { Job } from '../../api/jobs'

export type TrendDirection = 'up' | 'down' | 'flat'

export type PeriodTrend = {
  pctLabel: string
  direction: TrendDirection
}

const MS_DAY = 86_400_000

export function daysAgo(n: number): Date {
  return new Date(Date.now() - n * MS_DAY)
}

export function isDateInRange(iso: string | null, start: Date, end: Date): boolean {
  if (!iso) return false
  const t = new Date(iso).getTime()
  return t >= start.getTime() && t <= end.getTime()
}

/** Percent change from previous to current period; label always includes % sign. */
export function periodTrendPct(current: number, previous: number): PeriodTrend {
  if (previous === 0 && current === 0) {
    return { pctLabel: '0%', direction: 'flat' }
  }
  if (previous === 0) {
    return { pctLabel: '+100%', direction: 'up' }
  }
  const raw = ((current - previous) / previous) * 100
  const rounded = Math.round(raw)
  const direction: TrendDirection = rounded > 0 ? 'up' : rounded < 0 ? 'down' : 'flat'
  const sign = rounded > 0 ? '+' : ''
  return { pctLabel: `${sign}${rounded}%`, direction }
}

export function countApplicationsCreatedInRange(applications: Application[], start: Date, end: Date): number {
  return applications.filter(a => isDateInRange(a.created_at, start, end)).length
}

export function countOffersUpdatedInRange(applications: Application[], start: Date, end: Date): number {
  return applications.filter(a => a.status === 'offer' && isDateInRange(a.updated_at, start, end)).length
}

export function countInterviewsScheduledInRange(rows: InterviewAssignmentRow[], start: Date, end: Date): number {
  return rows.filter(r => r.scheduled_at && isDateInRange(r.scheduled_at, start, end)).length
}

export function countJobsPublishedInRange(jobs: Job[], start: Date, end: Date): number {
  return jobs.filter(j => j.published_at && isDateInRange(j.published_at, start, end)).length
}

export function countJobsCreatedInRange(jobs: Job[], start: Date, end: Date): number {
  return jobs.filter(j => isDateInRange(j.created_at, start, end)).length
}

export const FUNNEL_STAGE_ORDER = ['applied', 'screening', 'interview', 'offer', 'hired'] as const

export type FunnelStage = (typeof FUNNEL_STAGE_ORDER)[number]

export const FUNNEL_LABELS: Record<FunnelStage, string> = {
  applied: 'Applied',
  screening: 'Screening',
  interview: 'Interview',
  offer: 'Offer',
  hired: 'Hired',
}

export function workspaceFunnelCounts(applications: Application[]): Record<FunnelStage, number> {
  const base: Record<FunnelStage, number> = {
    applied: 0,
    screening: 0,
    interview: 0,
    offer: 0,
    hired: 0,
  }
  for (const a of applications) {
    const s = a.status as string
    if (s in base) base[s as FunnelStage] += 1
  }
  return base
}

export function applicantsPerJob(applications: Application[], jobs: Job[]): { jobId: number; title: string; count: number }[] {
  const titleById = new Map(jobs.map(j => [j.id, j.title]))
  const counts = new Map<number, number>()
  for (const a of applications) {
    counts.set(a.job_id, (counts.get(a.job_id) ?? 0) + 1)
  }
  return [...counts.entries()]
    .map(([jobId, count]) => ({
      jobId,
      title: titleById.get(jobId) ?? `Job #${jobId}`,
      count,
    }))
    .sort((x, y) => y.count - x.count)
}

export function sourceCountsWorkspace(applications: Application[]): Array<{ key: string; label: string; value: number }> {
  const acc: Record<string, number> = {}
  for (const a of applications) {
    const key = a.source_type || 'unknown'
    acc[key] = (acc[key] ?? 0) + 1
  }
  return Object.entries(acc)
    .map(([key, value]) => ({
      key,
      label: key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
      value,
    }))
    .filter(x => x.value > 0)
    .sort((a, b) => b.value - a.value)
}

export type ActivityItem = {
  id: string
  title: string
  subtitle: string
  at: number
  metaLabel: string
  tone: 'default' | 'success' | 'warning'
}

function formatActivityWhen(ts: number) {
  return new Date(ts).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function buildActivityFeed(
  applications: Application[],
  jobs: Job[],
  interviews: InterviewAssignmentRow[],
  limit = 14,
): ActivityItem[] {
  const jobTitle = (jobId: number) => {
    if (!jobId) return '—'
    return jobs.find(j => j.id === jobId)?.title ?? `Job #${jobId}`
  }
  const items: ActivityItem[] = []

  const recentApps = [...applications]
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    .slice(0, 40)

  for (const a of recentApps) {
    const name = a.candidate_name || a.candidate_email
    const createdTs = new Date(a.created_at).getTime()
    items.push({
      id: `app-${a.id}-created`,
      title: `New application · ${name}`,
      subtitle: jobTitle(a.job_id),
      at: createdTs,
      metaLabel: formatActivityWhen(createdTs),
      tone: 'default',
    })

    const lastHist = a.stage_history?.length ? a.stage_history[a.stage_history.length - 1] : null
    if (lastHist?.changed_at) {
      const stageTs = new Date(lastHist.changed_at).getTime()
      if (Number.isFinite(stageTs) && Math.abs(stageTs - createdTs) > 60_000) {
        items.push({
          id: `app-${a.id}-stage`,
          title: `Stage updated · ${name} → ${lastHist.stage.replace(/_/g, ' ')}`,
          subtitle: jobTitle(a.job_id),
          at: stageTs,
          metaLabel: formatActivityWhen(stageTs),
          tone: a.status === 'hired' ? 'success' : 'default',
        })
      }
    }
  }

  for (const row of interviews) {
    const cand = row.application?.candidate_name || row.application?.candidate_email || 'Candidate'
    const tsStr = row.scheduled_at || row.created_at
    if (!tsStr) continue
    const at = new Date(tsStr).getTime()
    if (!Number.isFinite(at)) continue
    const jobId = row.job?.id ?? row.application?.job_id ?? 0
    items.push({
      id: `int-${row.id}`,
      title: `Interview scheduled · ${cand}`,
      subtitle: row.job?.title ?? jobTitle(jobId),
      at,
      metaLabel: formatActivityWhen(at),
      tone: 'warning',
    })
  }

  items.sort((x, y) => y.at - x.at)
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

export function dominantApplicantStageLabel(applications: Application[]): string {
  if (applications.length === 0) return '—'
  const acc: Record<string, number> = {}
  for (const a of applications) {
    acc[a.status] = (acc[a.status] ?? 0) + 1
  }
  let best = ''
  let bestN = 0
  for (const [k, v] of Object.entries(acc)) {
    if (v > bestN) {
      best = k
      bestN = v
    }
  }
  return best.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}
