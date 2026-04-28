import type { Application } from '../../api/applications'
import type { Job } from '../../api/jobs'
import type { InterviewAssignmentRow } from '../../api/interviews'
import type { TrendDirection } from './DashboardStatCard'

function calendarMonthBounds(offsetFromCurrent: number) {
  const now = new Date()
  const y = now.getFullYear()
  const m = now.getMonth() - offsetFromCurrent
  const start = new Date(y, m, 1)
  const end = new Date(y, m + 1, 0, 23, 59, 59, 999)
  return { start, end }
}

function inRange(iso: string, start: Date, end: Date) {
  const t = new Date(iso).getTime()
  return t >= start.getTime() && t <= end.getTime()
}

export function monthOverMonthCount(
  current: number,
  previous: number,
): { direction: TrendDirection; pct: number | null } {
  if (previous === 0 && current === 0) return { direction: 'flat', pct: null }
  if (previous === 0) return { direction: 'up', pct: null }
  const raw = Math.round(((current - previous) / previous) * 100)
  const direction: TrendDirection = raw > 0 ? 'up' : raw < 0 ? 'down' : 'flat'
  return { direction, pct: Math.abs(raw) }
}

export function applicationsCreatedMom(apps: Application[]) {
  const cur = calendarMonthBounds(0)
  const prev = calendarMonthBounds(1)
  const current = apps.filter(a => inRange(a.created_at, cur.start, cur.end)).length
  const previous = apps.filter(a => inRange(a.created_at, prev.start, prev.end)).length
  return monthOverMonthCount(current, previous)
}

/** New jobs created this month vs last (proxy for hiring momentum). */
export function newJobsCreatedMom(jobs: Job[]) {
  const cur = calendarMonthBounds(0)
  const prev = calendarMonthBounds(1)
  const current = jobs.filter(j => inRange(j.created_at, cur.start, cur.end)).length
  const previous = jobs.filter(j => inRange(j.created_at, prev.start, prev.end)).length
  return monthOverMonthCount(current, previous)
}

export function scheduledInterviewsMom(rows: InterviewAssignmentRow[]) {
  const cur = calendarMonthBounds(0)
  const prev = calendarMonthBounds(1)
  const relevant = rows.filter(r => r.scheduled_at && (r.status === 'scheduled' || r.status === 'pending'))
  const current = relevant.filter(r => inRange(r.scheduled_at!, cur.start, cur.end)).length
  const previous = relevant.filter(r => inRange(r.scheduled_at!, prev.start, prev.end)).length
  return monthOverMonthCount(current, previous)
}

export function offersReleasedMom(apps: Application[]) {
  const cur = calendarMonthBounds(0)
  const prev = calendarMonthBounds(1)
  const offers = apps.filter(a => a.status === 'offer')
  const current = offers.filter(a => inRange(a.updated_at, cur.start, cur.end)).length
  const previous = offers.filter(a => inRange(a.updated_at, prev.start, prev.end)).length
  return monthOverMonthCount(current, previous)
}
