import type { Application } from '../../api/applications'
import type { InterviewAssignmentRow } from '../../api/interviews'
import type { Job } from '../../api/jobs'

export type TrendDirection = 'up' | 'down' | 'flat'

const MS_DAY = 86_400_000

function monthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1)
}

function addMonths(d: Date, n: number) {
  return new Date(d.getFullYear(), d.getMonth() + n, 1)
}

export function countInMonthKeys(isoDates: string[], keys: Set<string>) {
  let n = 0
  for (const iso of isoDates) {
    const k = monthKey(new Date(iso))
    if (keys.has(k)) n += 1
  }
  return n
}

/** Current and previous calendar month keys for trend comparisons */
export function currentAndPreviousMonthKeys(now = new Date()) {
  const cur = startOfMonth(now)
  const prev = addMonths(cur, -1)
  return { current: monthKey(cur), previous: monthKey(prev) }
}

export function trendFromCounts(current: number, previous: number): { direction: TrendDirection; label: string } {
  if (previous === 0 && current === 0) return { direction: 'flat', label: 'No change' }
  if (previous === 0) return { direction: 'up', label: current > 0 ? `+${current}` : 'No change' }
  const pct = Math.round(((current - previous) / previous) * 100)
  if (pct > 0) return { direction: 'up', label: `${pct > 0 ? '+' : ''}${pct}%` }
  if (pct < 0) return { direction: 'down', label: `${pct}%` }
  return { direction: 'flat', label: '0%' }
}

const FUNNEL_STATUSES = ['applied', 'screening', 'interview', 'offer', 'hired'] as const

export function funnelCountsFromApplications(applications: Application[]) {
  const counts: Record<string, number> = {}
  for (const s of FUNNEL_STATUSES) counts[s] = 0
  for (const a of applications) {
    const s = a.status
    if (s in counts) counts[s] += 1
  }
  return FUNNEL_STATUSES.map(key => ({ key, label: key.charAt(0).toUpperCase() + key.slice(1), count: counts[key] ?? 0 }))
}

export function applicantCountByJobId(applications: Application[]) {
  const map = new Map<number, number>()
  for (const a of applications) {
    map.set(a.job_id, (map.get(a.job_id) ?? 0) + 1)
  }
  return map
}

export function dominantStageForJob(applications: Application[], jobId: number): string | null {
  const byStatus: Record<string, number> = {}
  for (const a of applications) {
    if (a.job_id !== jobId) continue
    byStatus[a.status] = (byStatus[a.status] ?? 0) + 1
  }
  const entries = Object.entries(byStatus)
  if (entries.length === 0) return null
  entries.sort((a, b) => b[1] - a[1])
  return entries[0][0]
}

export type ActivityKind = 'application' | 'interview' | 'offer' | 'hired'

export type ActivityFeedItem = {
  id: string
  kind: ActivityKind
  title: string
  subtitle: string
  at: string
}

export function buildActivityFeed(
  applications: Application[],
  interviews: InterviewAssignmentRow[],
  limit = 14,
): ActivityFeedItem[] {
  const items: ActivityFeedItem[] = []

  for (const a of applications) {
    const name = a.candidate_name || a.candidate_email
    items.push({
      id: `app-created-${a.id}`,
      kind: 'application',
      title: 'New application',
      subtitle: `${name} · Job #${a.job_id}`,
      at: a.created_at,
    })
    if (a.status === 'offer' && a.updated_at && a.updated_at !== a.created_at) {
      items.push({
        id: `app-offer-${a.id}`,
        kind: 'offer',
        title: 'Offer stage',
        subtitle: `${name} · Job #${a.job_id}`,
        at: a.updated_at,
      })
    }
    if (a.status === 'hired' && a.updated_at) {
      items.push({
        id: `app-hired-${a.id}`,
        kind: 'hired',
        title: 'Candidate hired',
        subtitle: `${name} · Job #${a.job_id}`,
        at: a.updated_at,
      })
    }
  }

  for (const row of interviews) {
    if (!row.scheduled_at) continue
    const name =
      row.application?.candidate_name || row.application?.candidate_email || 'Candidate'
    const jobTitle = row.job?.title ?? `Job #${row.application?.job_id ?? '—'}`
    items.push({
      id: `int-${row.id}`,
      kind: 'interview',
      title: 'Interview scheduled',
      subtitle: `${name} · ${jobTitle}`,
      at: row.scheduled_at,
    })
  }

  items.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
  const seen = new Set<string>()
  const deduped: ActivityFeedItem[] = []
  for (const it of items) {
    if (seen.has(it.id)) continue
    seen.add(it.id)
    deduped.push(it)
    if (deduped.length >= limit) break
  }
  return deduped
}

export function formatActivityTimestamp(iso: string) {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function openJobsCreatedInMonth(jobs: Job[], monthKeyStr: string) {
  return jobs.filter(j => j.status === 'open' && monthKey(new Date(j.created_at)) === monthKeyStr).length
}

export function interviewsScheduledInMonth(interviews: InterviewAssignmentRow[], monthKeyStr: string) {
  return interviews.filter(row => {
    if (!row.scheduled_at) return false
    return monthKey(new Date(row.scheduled_at)) === monthKeyStr
  }).length
}

export function applicationsInStatusUpdatedInMonth(applications: Application[], status: string, monthKeyStr: string) {
  return applications.filter(a => a.status === status && monthKey(new Date(a.updated_at)) === monthKeyStr).length
}

export function newApplicationsInMonth(applications: Application[], monthKeyStr: string) {
  return applications.filter(a => monthKey(new Date(a.created_at)) === monthKeyStr).length
}

/** Approximate "active pipeline" candidates (in-progress stages) */
export function activePipelineCandidates(applications: Application[]) {
  const active = new Set(['applied', 'screening', 'interview', 'offer'])
  return applications.filter(a => active.has(a.status)).length
}

export function daysAgoIso(days: number) {
  return new Date(Date.now() - days * MS_DAY).toISOString()
}
