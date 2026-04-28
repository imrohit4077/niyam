import type { Application } from '../../api/applications'
import type { InterviewAssignmentRow } from '../../api/interviews'
import type { Job } from '../../api/jobs'

export type PeriodTrend = {
  current: number
  previous: number
  pctLabel: string
  positive: boolean
}

function pctChange(current: number, previous: number): PeriodTrend {
  if (previous === 0 && current === 0) return { current, previous, pctLabel: '0%', positive: true }
  if (previous === 0) return { current, previous, pctLabel: '—', positive: current >= 0 }
  const raw = ((current - previous) / previous) * 100
  const rounded = Math.round(Math.abs(raw))
  const positive = raw >= 0
  return {
    current,
    previous,
    pctLabel: `${rounded}%`,
    positive,
  }
}

function inRange(d: Date, start: Date, end: Date) {
  return d >= start && d < end
}

/** Last `days` ending at `now`, and the equal-length window before it. */
export function rollingWindows(now: Date, days: number) {
  const end = now.getTime()
  const startCurrent = end - days * 86400000
  const startPrevious = startCurrent - days * 86400000
  return {
    currentStart: new Date(startCurrent),
    currentEnd: new Date(end),
    previousStart: new Date(startPrevious),
    previousEnd: new Date(startCurrent),
  }
}

export function applicationsCreatedTrend(applications: Application[], now = new Date(), days = 30): PeriodTrend {
  const { currentStart, currentEnd, previousStart, previousEnd } = rollingWindows(now, days)
  const cur = applications.filter(a => inRange(new Date(a.created_at), currentStart, currentEnd)).length
  const prev = applications.filter(a => inRange(new Date(a.created_at), previousStart, previousEnd)).length
  return pctChange(cur, prev)
}

/** New jobs created in each window (any status) — use as velocity trend alongside current open count. */
export function jobsPostedTrend(jobs: Job[], now = new Date(), days = 30): PeriodTrend {
  const { currentStart, currentEnd, previousStart, previousEnd } = rollingWindows(now, days)
  const cur = jobs.filter(j => inRange(new Date(j.created_at), currentStart, currentEnd)).length
  const prev = jobs.filter(j => inRange(new Date(j.created_at), previousStart, previousEnd)).length
  return pctChange(cur, prev)
}

export function interviewsScheduledTrend(rows: InterviewAssignmentRow[], now = new Date(), days = 30): PeriodTrend {
  const { currentStart, currentEnd, previousStart, previousEnd } = rollingWindows(now, days)
  const cur = rows.filter(r => {
    if (!r.scheduled_at) return false
    return inRange(new Date(r.scheduled_at), currentStart, currentEnd)
  }).length
  const prev = rows.filter(r => {
    if (!r.scheduled_at) return false
    return inRange(new Date(r.scheduled_at), previousStart, previousEnd)
  }).length
  return pctChange(cur, prev)
}

function offerEventsInRange(applications: Application[], start: Date, end: Date): number {
  let n = 0
  for (const app of applications) {
    const hist = app.stage_history ?? []
    let matched = false
    for (const h of hist) {
      if (String(h.stage).toLowerCase() !== 'offer') continue
      const t = new Date(h.changed_at)
      if (inRange(t, start, end)) {
        n += 1
        matched = true
        break
      }
    }
    if (matched) continue
    if (app.status === 'offer') {
      const t = new Date(app.updated_at)
      if (inRange(t, start, end)) n += 1
    }
  }
  return n
}

export function offersReleasedTrend(applications: Application[], now = new Date(), days = 30): PeriodTrend {
  const { currentStart, currentEnd, previousStart, previousEnd } = rollingWindows(now, days)
  const cur = offerEventsInRange(applications, currentStart, currentEnd)
  const prev = offerEventsInRange(applications, previousStart, previousEnd)
  return pctChange(cur, prev)
}
