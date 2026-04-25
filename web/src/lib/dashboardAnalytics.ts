import type { Application } from '../api/applications'
import type { InterviewAssignmentRow } from '../api/interviews'
import type { Job } from '../api/jobs'

const MS_DAY = 86_400_000

export type ActivityKind = 'application' | 'stage' | 'interview'

export type ActivityItem = {
  id: string
  kind: ActivityKind
  title: string
  subtitle: string
  at: string
  href?: string
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
  const t = new Date(iso).getTime()
  const diff = Date.now() - t
  if (diff < 60_000) return 'Just now'
  if (diff < 3600_000) return `${Math.floor(diff / 60_000)}m ago`
  if (diff < 86400_000) return `${Math.floor(diff / 3600_000)}h ago`
  if (diff < 7 * MS_DAY) return `${Math.floor(diff / 86400_000)}d ago`
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

/** Percent change vs prior bucket; returns null if prior is 0 and current is 0 */
export function pctChange(current: number, previous: number): number | null {
  if (previous === 0 && current === 0) return null
  if (previous === 0) return null
  return Math.round(((current - previous) / previous) * 100)
}

export function trendFromPct(pct: number | null): { arrow: '↑' | '↓' | '—'; label: string; positive: boolean } {
  if (pct == null) return { arrow: '—', label: '—', positive: true }
  if (pct === 0) return { arrow: '—', label: '0%', positive: true }
  const positive = pct > 0
  return { arrow: positive ? '↑' : '↓', label: `${Math.abs(pct)}%`, positive }
}

const FUNNEL_ORDER = ['applied', 'screening', 'interview', 'offer', 'hired'] as const

export function workspaceFunnelCounts(applications: Application[]) {
  const by = applications.reduce<Record<string, number>>((acc, a) => {
    acc[a.status] = (acc[a.status] ?? 0) + 1
    return acc
  }, {})
  return FUNNEL_ORDER.map(stage => ({
    stage,
    label: formatDashboardLabel(stage),
    count: by[stage] ?? 0,
  }))
}

export function jobApplicantCounts(jobs: Job[], applications: Application[], limit = 10) {
  const counts = new Map<number, number>()
  for (const a of applications) {
    counts.set(a.job_id, (counts.get(a.job_id) ?? 0) + 1)
  }
  return jobs
    .map(j => ({ job: j, count: counts.get(j.id) ?? 0 }))
    .filter(x => x.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, limit)
}

export function sourceSlicesFromApplications(applications: Application[]) {
  const acc = applications.reduce<Record<string, number>>((m, a) => {
    const k = a.source_type?.trim() || 'unknown'
    m[k] = (m[k] ?? 0) + 1
    return m
  }, {})
  return Object.entries(acc)
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([label, value]) => ({ label: formatDashboardLabel(label), value, key: label }))
}

export function monthlyTrendKeys(monthsBackInclusive: number) {
  const now = new Date()
  return Array.from({ length: monthsBackInclusive }, (_, idx) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (monthsBackInclusive - 1 - idx), 1)
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    const label = date.toLocaleDateString('en-US', { month: 'short' })
    return { key, label }
  })
}

export function applicationsPerMonth(applications: Application[], keys: { key: string; label: string }[]) {
  const counters = Object.fromEntries(keys.map(k => [k.key, 0])) as Record<string, number>
  for (const a of applications) {
    const d = new Date(a.created_at)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    if (key in counters) counters[key] += 1
  }
  return keys.map(k => ({ label: k.label, value: counters[k.key] ?? 0 }))
}

function countInRange(isoDates: string[], start: number, end: number) {
  return isoDates.filter(iso => {
    const t = new Date(iso).getTime()
    return t >= start && t < end
  }).length
}

export function buildActivityFeed(
  applications: Application[],
  interviews: InterviewAssignmentRow[],
  accountId: string,
  maxItems = 14,
): ActivityItem[] {
  const items: ActivityItem[] = []

  for (const a of applications) {
    items.push({
      id: `app-${a.id}`,
      kind: 'application',
      title: `Candidate ${a.candidate_name || a.candidate_email || 'added'}`,
      subtitle: `Application • ${formatDashboardLabel(a.status)}`,
      at: a.created_at,
      href: `/account/${accountId}/jobs/${a.job_id}/pipeline`,
    })
    const history = a.stage_history ?? []
    const last = history[history.length - 1]
    if (last && last.changed_at !== a.created_at) {
      items.push({
        id: `stage-${a.id}-${last.changed_at}`,
        kind: 'stage',
        title: `${a.candidate_name || a.candidate_email || 'Candidate'} moved to ${formatDashboardLabel(last.stage)}`,
        subtitle: 'Pipeline update',
        at: last.changed_at,
        href: `/account/${accountId}/jobs/${a.job_id}/pipeline`,
      })
    }
  }

  for (const row of interviews) {
    const name = row.application?.candidate_name || row.application?.candidate_email || 'Candidate'
    const jobTitle = row.job?.title ?? 'Role'
    items.push({
      id: `int-${row.id}`,
      kind: 'interview',
      title: `Interview ${row.status === 'scheduled' ? 'scheduled' : 'updated'} — ${name}`,
      subtitle: `${jobTitle} • ${formatDashboardLabel(row.status)}`,
      at: row.scheduled_at || row.updated_at || row.created_at,
      href: `/account/${accountId}/interviews`,
    })
  }

  return items
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .slice(0, maxItems)
}

function firstOfferAt(application: Application): string | null {
  const hit = (application.stage_history ?? []).find(h => h.stage === 'offer')
  if (hit?.changed_at) return hit.changed_at
  if (application.status === 'offer') return application.updated_at
  return null
}

export function workspaceSummaryTrends(
  applications: Application[],
  jobs: Job[],
  interviews: InterviewAssignmentRow[],
  monthlyTrend: { label: string; value: number }[],
) {
  const now = Date.now()
  const cur30 = now - 30 * MS_DAY
  const prev60 = now - 60 * MS_DAY

  const appCreated = applications.map(a => a.created_at)
  const apps30 = countInRange(appCreated, cur30, now)
  const appsPrev30 = countInRange(appCreated, prev60, cur30)

  const openJobs = jobs.filter(j => j.status === 'open').length
  const jobsCreated30 = countInRange(
    jobs.map(j => j.created_at),
    cur30,
    now,
  )
  const jobsCreatedPrev30 = countInRange(
    jobs.map(j => j.created_at),
    prev60,
    cur30,
  )

  const intActivity = interviews.map(r => r.scheduled_at || r.updated_at || r.created_at)
  const int30 = countInRange(intActivity, cur30, now)
  const intPrev30 = countInRange(intActivity, prev60, cur30)

  const offerNow = applications.filter(a => a.status === 'offer').length
  let offersEntered30 = 0
  let offersEnteredPrev30 = 0
  for (const a of applications) {
    const at = firstOfferAt(a)
    if (!at) continue
    const t = new Date(at).getTime()
    if (t >= cur30 && t <= now) offersEntered30 += 1
    else if (t >= prev60 && t < cur30) offersEnteredPrev30 += 1
  }

  const momApps =
    monthlyTrend.length >= 2
      ? pctChange(monthlyTrend[monthlyTrend.length - 1]!.value, monthlyTrend[monthlyTrend.length - 2]!.value)
      : null

  return {
    candidatesMomPct: momApps,
    candidatesWoWStyle: pctChange(apps30, appsPrev30),
    /** New job postings (any status) last 30d vs prior — proxy for hiring momentum */
    activeJobsListingMomentumPct: pctChange(jobsCreated30, jobsCreatedPrev30),
    interviewsActivityPct: pctChange(int30, intPrev30),
    offersEnteredPct: pctChange(offersEntered30, offersEnteredPrev30),
    openJobs,
    offerNow,
    apps30,
    appsPrev30,
  }
}
