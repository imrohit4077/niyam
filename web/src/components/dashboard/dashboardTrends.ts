import type { Application } from '../../api/applications'
import type { InterviewAssignmentRow } from '../../api/interviews'
import type { Job } from '../../api/jobs'
import type { MonthlyTrendPoint } from './dashboardWorkspaceMetrics'
import { percentChange } from './dashboardWorkspaceMetrics'

export function trendFromMonthlyTrend(monthlyTrend: MonthlyTrendPoint[]): number | null {
  if (monthlyTrend.length < 2) return null
  const curr = monthlyTrend[monthlyTrend.length - 1]?.value ?? 0
  const prev = monthlyTrend[monthlyTrend.length - 2]?.value ?? 0
  return percentChange(prev, curr)
}

/** New jobs created this month vs last (any status). */
export function newJobsCreatedTrend(jobs: Job[]): number | null {
  const now = new Date()
  const thisKey = `${now.getFullYear()}-${now.getMonth()}`
  const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const prevKey = `${prevDate.getFullYear()}-${prevDate.getMonth()}`
  let thisM = 0
  let prevM = 0
  for (const j of jobs) {
    const d = new Date(j.created_at)
    const key = `${d.getFullYear()}-${d.getMonth()}`
    if (key === thisKey) thisM += 1
    if (key === prevKey) prevM += 1
  }
  return percentChange(prevM, thisM)
}

/** Interviews with scheduled_at in [now, now+14d] vs [now-14d, now). */
export function upcomingInterviewsWindowTrend(rows: InterviewAssignmentRow[]): number | null {
  const now = Date.now()
  const d14 = 14 * 86400000
  let upcoming = 0
  let prevWindow = 0
  for (const row of rows) {
    if (!row.scheduled_at) continue
    const t = new Date(row.scheduled_at).getTime()
    if (Number.isNaN(t)) continue
    if (t >= now && t < now + d14) upcoming += 1
    if (t >= now - d14 && t < now) prevWindow += 1
  }
  return percentChange(prevWindow, upcoming)
}

/** Applications moved to offer status this month vs last (heuristic via updated_at). */
export function offersReleasedTrend(allApplications: Application[]): number | null {
  const now = new Date()
  const thisMonth = now.getMonth()
  const thisYear = now.getFullYear()
  const prev = new Date(thisYear, thisMonth - 1, 1)
  let thisC = 0
  let prevC = 0
  for (const a of allApplications) {
    if (a.status !== 'offer') continue
    const d = new Date(a.updated_at)
    if (d.getFullYear() === thisYear && d.getMonth() === thisMonth) thisC += 1
    if (d.getFullYear() === prev.getFullYear() && d.getMonth() === prev.getMonth()) prevC += 1
  }
  return percentChange(prevC, thisC)
}
