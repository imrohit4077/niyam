import type { AuditLogEntry } from '../../api/auditLog'
import type { Application } from '../../api/applications'
import type { InterviewAssignmentRow } from '../../api/interviews'
import type { Job } from '../../api/jobs'

/** Canonical pipeline stages for funnel visualization (current snapshot per application). */
export const PIPELINE_FUNNEL_STATUSES = ['applied', 'screening', 'interview', 'offer', 'hired'] as const

export type TrendDirection = 'up' | 'down' | 'flat'

export type TrendIndicator = {
  direction: TrendDirection
  /** Whole percent vs prior period, or null when not meaningful */
  pct: number | null
  label: string
}

export function countApplicationsCreatedBetween(
  applications: Application[],
  start: Date,
  end: Date,
): number {
  const t0 = start.getTime()
  const t1 = end.getTime()
  return applications.filter(a => {
    const t = new Date(a.created_at).getTime()
    return t >= t0 && t < t1
  }).length
}

export function trendVsPriorPeriod(current: number, previous: number): TrendIndicator {
  if (previous === 0 && current === 0) {
    return { direction: 'flat', pct: 0, label: '0%' }
  }
  if (previous === 0 && current > 0) {
    return { direction: 'up', pct: null, label: 'New' }
  }
  const raw = Math.round(((current - previous) / previous) * 100)
  const direction: TrendDirection = raw > 0 ? 'up' : raw < 0 ? 'down' : 'flat'
  return {
    direction,
    pct: raw,
    label: `${raw > 0 ? '+' : ''}${raw}%`,
  }
}

export function countJobsCreatedBetween(jobs: Job[], start: Date, end: Date): number {
  const t0 = start.getTime()
  const t1 = end.getTime()
  return jobs.filter(j => {
    const t = new Date(j.created_at).getTime()
    return t >= t0 && t < t1
  }).length
}

export function funnelCountsFromApplications(applications: Application[]): Record<string, number> {
  const base: Record<string, number> = {}
  for (const s of PIPELINE_FUNNEL_STATUSES) base[s] = 0
  for (const a of applications) {
    const key = (a.status || 'applied').toLowerCase()
    if (key in base) base[key] += 1
  }
  return base
}

export function applicantsPerJob(applications: Application[]): Map<number, number> {
  const m = new Map<number, number>()
  for (const a of applications) {
    m.set(a.job_id, (m.get(a.job_id) ?? 0) + 1)
  }
  return m
}

export function dominantApplicantStatusForJob(
  applications: Application[],
  jobId: number,
): string | null {
  const counts: Record<string, number> = {}
  for (const a of applications) {
    if (a.job_id !== jobId) continue
    counts[a.status] = (counts[a.status] ?? 0) + 1
  }
  const entries = Object.entries(counts)
  if (entries.length === 0) return null
  entries.sort((a, b) => b[1] - a[1])
  return entries[0][0]
}

/** Interview assignments created in range while still in a schedulable state (activity proxy). */
export function countInterviewSchedulingCreatedBetween(
  rows: InterviewAssignmentRow[],
  start: Date,
  end: Date,
): number {
  const t0 = start.getTime()
  const t1 = end.getTime()
  return rows.filter(r => {
    if (r.status !== 'scheduled' && r.status !== 'pending') return false
    const t = new Date(r.created_at).getTime()
    return t >= t0 && t < t1
  }).length
}

/** Applications moved to offer (by updated_at) in range — proxy for offers released. */
export function countOffersTouchedBetween(
  applications: Application[],
  start: Date,
  end: Date,
): number {
  const t0 = start.getTime()
  const t1 = end.getTime()
  return applications.filter(a => {
    if (a.status !== 'offer') return false
    const t = new Date(a.updated_at).getTime()
    return t >= t0 && t < t1
  }).length
}

export function formatAuditActivityLine(entry: AuditLogEntry): string {
  const actor = entry.actor_display?.trim() || 'Team member'
  const verb = (entry.action || entry.http_method || 'updated').replace(/_/g, ' ')
  const resource = (entry.resource || 'record').replace(/_/g, ' ')
  const meta = entry.metadata || {}
  const candidate =
    typeof meta.candidate_name === 'string'
      ? meta.candidate_name
      : typeof meta.candidate_email === 'string'
        ? meta.candidate_email
        : null
  const jobTitle = typeof meta.job_title === 'string' ? meta.job_title : null
  const bits = [candidate, jobTitle].filter(Boolean)
  const suffix = bits.length ? ` — ${bits.join(' · ')}` : ''
  return `${actor} ${verb} ${resource}${suffix}`
}
