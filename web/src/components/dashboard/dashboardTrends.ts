import type { Application } from '../../api/applications'
import type { InterviewAssignmentRow } from '../../api/interviews'
import type { Job } from '../../api/jobs'
import type { KpiTrend, TrendDirection } from './dashboardTypes'

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

function addDays(d: Date, n: number) {
  const x = new Date(d)
  x.setDate(x.getDate() + n)
  return x
}

function inRange(iso: string, start: Date, end: Date) {
  const t = new Date(iso).getTime()
  return t >= start.getTime() && t < end.getTime()
}

function trendFromCounts(current: number, previous: number, label: string): KpiTrend {
  let direction: TrendDirection = 'flat'
  let percent = 0
  if (previous > 0) {
    percent = Math.round(((current - previous) / previous) * 100)
    if (percent > 0) direction = 'up'
    else if (percent < 0) direction = 'down'
  } else if (current > 0) {
    percent = 100
    direction = 'up'
  }
  return { direction, percent, label }
}

/** New applications created in each window (by created_at). */
export function applicationVolumeTrend(
  applications: Application[],
  days = 30,
): KpiTrend {
  const today = startOfDay(new Date())
  const curStart = addDays(today, -days)
  const prevStart = addDays(today, -days * 2)
  const prevEnd = curStart
  const cur = applications.filter(a => inRange(a.created_at, curStart, today)).length
  const prev = applications.filter(a => inRange(a.created_at, prevStart, prevEnd)).length
  return trendFromCounts(cur, prev, `vs prior ${days} days`)
}

/** Jobs created in each window (proxy for hiring activity). */
export function jobListingTrend(jobs: Job[], days = 30): KpiTrend {
  const today = startOfDay(new Date())
  const curStart = addDays(today, -days)
  const prevStart = addDays(today, -days * 2)
  const prevEnd = curStart
  const cur = jobs.filter(j => inRange(j.created_at, curStart, today)).length
  const prev = jobs.filter(j => inRange(j.created_at, prevStart, prevEnd)).length
  return trendFromCounts(cur, prev, `vs prior ${days} days`)
}

/** New open roles posted in each window (subset of `jobListingTrend`). */
export function openRolesPostedTrend(openJobs: Job[], days = 30) {
  return jobListingTrend(openJobs, days)
}

/** Interview assignments created (scheduling activity). */
export function interviewSchedulingTrend(rows: InterviewAssignmentRow[], days = 14): KpiTrend {
  const today = startOfDay(new Date())
  const curStart = addDays(today, -days)
  const prevStart = addDays(today, -days * 2)
  const prevEnd = curStart
  const cur = rows.filter(r => inRange(r.created_at, curStart, today)).length
  const prev = rows.filter(r => inRange(r.created_at, prevStart, prevEnd)).length
  return trendFromCounts(cur, prev, `vs prior ${days} days`)
}

function firstOfferAt(application: Application): string | null {
  const hist = application.stage_history
  if (!hist?.length) return null
  const offer = hist.find(h => h.stage === 'offer')
  return offer?.changed_at ?? null
}

/** Count applications that first reached offer stage in the window (stage_history). */
export function offersReleasedTrend(applications: Application[], days = 30): KpiTrend {
  const today = startOfDay(new Date())
  const curStart = addDays(today, -days)
  const prevStart = addDays(today, -days * 2)
  const prevEnd = curStart
  const cur = applications.filter(a => {
    const t = firstOfferAt(a)
    return t && inRange(t, curStart, today)
  }).length
  const prev = applications.filter(a => {
    const t = firstOfferAt(a)
    return t && inRange(t, prevStart, prevEnd)
  }).length
  return trendFromCounts(cur, prev, `vs prior ${days} days`)
}
