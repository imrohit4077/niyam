import type { Application } from '../../api/applications'
import type { InterviewAssignmentRow } from '../../api/interviews'
import type { Job } from '../../api/jobs'

const MS_DAY = 86_400_000

export type TrendDirection = 'up' | 'down' | 'flat'

export type PeriodCompare = {
  current: number
  previous: number
  pct: number | null
  direction: TrendDirection
}

function startEndWindows(now = new Date()) {
  const end = now.getTime()
  const curStart = end - 30 * MS_DAY
  const prevStart = end - 60 * MS_DAY
  return { curStart, prevStart, end, mid: curStart }
}

function inRange(t: number, lo: number, hi: number) {
  return t >= lo && t < hi
}

export function compareApplicationCreatedInWindows(apps: Application[]): PeriodCompare {
  const { curStart, prevStart, end, mid } = startEndWindows()
  let cur = 0
  let prev = 0
  for (const a of apps) {
    const t = new Date(a.created_at).getTime()
    if (inRange(t, curStart, end)) cur += 1
    else if (inRange(t, prevStart, mid)) prev += 1
  }
  return wrapCompare(cur, prev)
}

export function compareJobsCreatedInWindows(jobs: Job[]): PeriodCompare {
  const { curStart, prevStart, end, mid } = startEndWindows()
  let cur = 0
  let prev = 0
  for (const j of jobs) {
    const t = new Date(j.created_at).getTime()
    if (inRange(t, curStart, end)) cur += 1
    else if (inRange(t, prevStart, mid)) prev += 1
  }
  return wrapCompare(cur, prev)
}

export function compareInterviewsScheduledInWindows(rows: InterviewAssignmentRow[]): PeriodCompare {
  const { curStart, prevStart, end, mid } = startEndWindows()
  let cur = 0
  let prev = 0
  for (const r of rows) {
    if (!r.scheduled_at) continue
    const t = new Date(r.scheduled_at).getTime()
    if (inRange(t, curStart, end)) cur += 1
    else if (inRange(t, prevStart, mid)) prev += 1
  }
  return wrapCompare(cur, prev)
}

/** Count applications that reached offer stage (per stage_history) in each window. */
export function compareOffersFromHistory(apps: Application[]): PeriodCompare {
  const { curStart, prevStart, end, mid } = startEndWindows()
  let cur = 0
  let prev = 0
  for (const a of apps) {
    for (const h of a.stage_history ?? []) {
      if (h.stage !== 'offer') continue
      const t = new Date(h.changed_at).getTime()
      if (inRange(t, curStart, end)) cur += 1
      else if (inRange(t, prevStart, mid)) prev += 1
    }
  }
  return wrapCompare(cur, prev)
}

function wrapCompare(current: number, previous: number): PeriodCompare {
  let pct: number | null = null
  if (previous > 0) pct = Math.round(((current - previous) / previous) * 100)
  else if (current > 0) pct = 100
  else pct = 0
  let direction: TrendDirection = 'flat'
  if (current > previous) direction = 'up'
  else if (current < previous) direction = 'down'
  return { current, previous, pct, direction }
}

export function formatTrendLabel(c: PeriodCompare): string {
  if (c.pct === null) return '—'
  const sign = c.pct > 0 ? '+' : ''
  return `${sign}${c.pct}%`
}
