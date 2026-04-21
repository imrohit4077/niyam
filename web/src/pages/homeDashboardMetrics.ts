import type { Application } from '../api/applications'
import type { InterviewAssignmentRow } from '../api/interviews'
import type { Job } from '../api/jobs'

export type TrendTone = 'up' | 'down' | 'flat'

export type PeriodTrend = {
  tone: TrendTone
  label: string
}

const MS_DAY = 86_400_000

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

/** Last 30 days vs previous 30 days, based on `dateField` on each row. */
export function periodPairTrend<T>(
  rows: T[],
  getDate: (row: T) => string | null | undefined,
  predicate?: (row: T) => boolean,
): PeriodTrend {
  const now = startOfDay(new Date())
  const endRecent = now.getTime()
  const startRecent = endRecent - 30 * MS_DAY
  const startPrev = startRecent - 30 * MS_DAY

  let recent = 0
  let previous = 0
  for (const row of rows) {
    if (predicate && !predicate(row)) continue
    const raw = getDate(row)
    if (!raw) continue
    const t = new Date(raw).getTime()
    if (t >= startRecent && t < endRecent) recent += 1
    else if (t >= startPrev && t < startRecent) previous += 1
  }

  return countsToTrend(recent, previous)
}

export function uniqueCandidateEmails(applications: Application[]) {
  return new Set(applications.map(a => a.candidate_email.trim().toLowerCase()).filter(Boolean))
}

export function countsToTrend(current: number, previous: number): PeriodTrend {
  if (previous === 0) {
    if (current === 0) return { tone: 'flat', label: '0% vs prior period' }
    return { tone: 'up', label: 'New vs prior period' }
  }
  const pct = Math.round(((current - previous) / previous) * 100)
  const tone: TrendTone = pct > 0 ? 'up' : pct < 0 ? 'down' : 'flat'
  const sign = pct > 0 ? '+' : ''
  return { tone, label: `${sign}${pct}% vs prior 30 days` }
}

/** New open requisitions created in each window (proxy for hiring momentum). */
export function newOpenJobsTrend(jobs: Job[]): PeriodTrend {
  return periodPairTrend(jobs, j => j.created_at, j => j.status === 'open')
}

export function interviewScheduleTrend(rows: InterviewAssignmentRow[]): PeriodTrend {
  return periodPairTrend(
    rows,
    r => r.scheduled_at,
    r => r.status === 'scheduled' || r.status === 'pending' || !!r.scheduled_at,
  )
}

export function offersReleasedTrend(applications: Application[]): PeriodTrend {
  return periodPairTrend(
    applications,
    a => a.updated_at,
    a => a.status === 'offer',
  )
}

const FUNNEL_ORDER = ['applied', 'screening', 'interview', 'offer', 'hired'] as const

export type FunnelStage = (typeof FUNNEL_ORDER)[number]

export function workspaceFunnelCounts(applications: Application[]) {
  const counts: Record<FunnelStage, number> = {
    applied: 0,
    screening: 0,
    interview: 0,
    offer: 0,
    hired: 0,
  }
  for (const a of applications) {
    const s = a.status as string
    if (s in counts) counts[s as FunnelStage] += 1
  }
  return FUNNEL_ORDER.map(stage => ({ stage, label: formatStageLabel(stage), count: counts[stage] }))
}

function formatStageLabel(stage: string) {
  return stage.replace(/_/g, ' ').replace(/\b\w/g, ch => ch.toUpperCase())
}

export function applicantsPerJob(job: Job, applications: Application[]) {
  return applications.filter(a => a.job_id === job.id).length
}

const PIPELINE_STAGES = ['applied', 'screening', 'interview', 'offer', 'hired'] as const

export function dominantPipelineStage(counts: Record<string, number>) {
  let best: string | null = null
  let bestN = 0
  for (const s of PIPELINE_STAGES) {
    const n = counts[s] ?? 0
    if (n > bestN) {
      best = s
      bestN = n
    }
  }
  return best && bestN > 0 ? best : '—'
}

/** First application timestamp per candidate email (workspace-wide). */
function firstApplicationTimeByEmail(applications: Application[]) {
  const map = new Map<string, number>()
  for (const a of applications) {
    const email = a.candidate_email.trim().toLowerCase()
    if (!email) continue
    const t = new Date(a.created_at).getTime()
    const prev = map.get(email)
    if (prev === undefined || t < prev) map.set(email, t)
  }
  return map
}

/** New candidates (first touch in period) vs prior 30 days. */
export function newUniqueCandidatesTrend(applications: Application[]): PeriodTrend {
  const firstSeen = firstApplicationTimeByEmail(applications)
  const now = startOfDay(new Date())
  const endRecent = now.getTime()
  const startRecent = endRecent - 30 * MS_DAY
  const startPrev = startRecent - 30 * MS_DAY

  let recent = 0
  let previous = 0
  for (const t of firstSeen.values()) {
    if (t >= startRecent && t < endRecent) recent += 1
    else if (t >= startPrev && t < startRecent) previous += 1
  }
  return countsToTrend(recent, previous)
}
