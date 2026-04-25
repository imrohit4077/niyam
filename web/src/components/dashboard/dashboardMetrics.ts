import type { Application } from '../../api/applications'
import type { InterviewAssignmentRow } from '../../api/interviews'
import type { Job } from '../../api/jobs'

const MS_DAY = 86400000

export function windowBounds(daysEach: number): { curStart: Date; curEnd: Date; prevStart: Date; prevEnd: Date } {
  const curEnd = new Date()
  const curStart = new Date(curEnd.getTime() - daysEach * MS_DAY)
  const prevEnd = new Date(curStart.getTime())
  const prevStart = new Date(prevEnd.getTime() - daysEach * MS_DAY)
  return { curStart, curEnd, prevStart, prevEnd }
}

function inRange(d: Date, start: Date, end: Date) {
  return d >= start && d < end
}

export function applicationsCreatedTrend(apps: Application[], daysEach = 14) {
  const { curStart, curEnd, prevStart, prevEnd } = windowBounds(daysEach)
  let cur = 0
  let prev = 0
  for (const a of apps) {
    const d = new Date(a.created_at)
    if (inRange(d, curStart, curEnd)) cur += 1
    else if (inRange(d, prevStart, prevEnd)) prev += 1
  }
  return { current: cur, previous: prev }
}

export function jobsCreatedTrend(jobs: Job[], daysEach = 14) {
  const { curStart, curEnd, prevStart, prevEnd } = windowBounds(daysEach)
  let cur = 0
  let prev = 0
  for (const j of jobs) {
    const d = new Date(j.created_at)
    if (inRange(d, curStart, curEnd)) cur += 1
    else if (inRange(d, prevStart, prevEnd)) prev += 1
  }
  return { current: cur, previous: prev }
}

/** Count interviews with scheduled_at in each window */
export function interviewsScheduledTrend(rows: InterviewAssignmentRow[], daysEach = 14) {
  const { curStart, curEnd, prevStart, prevEnd } = windowBounds(daysEach)
  let cur = 0
  let prev = 0
  for (const r of rows) {
    if (!r.scheduled_at) continue
    const d = new Date(r.scheduled_at)
    if (inRange(d, curStart, curEnd)) cur += 1
    else if (inRange(d, prevStart, prevEnd)) prev += 1
  }
  return { current: cur, previous: prev }
}

/** Applications in offer status with updated_at in window (proxy for offer activity) */
export function offersActivityTrend(apps: Application[], daysEach = 14) {
  const { curStart, curEnd, prevStart, prevEnd } = windowBounds(daysEach)
  let cur = 0
  let prev = 0
  for (const a of apps) {
    if (a.status !== 'offer') continue
    const d = new Date(a.updated_at)
    if (inRange(d, curStart, curEnd)) cur += 1
    else if (inRange(d, prevStart, prevEnd)) prev += 1
  }
  return { current: cur, previous: prev }
}

export const PIPELINE_FUNNEL_STAGES = ['applied', 'screening', 'interview', 'offer', 'hired'] as const

export function funnelStageCounts(apps: Application[]): Record<(typeof PIPELINE_FUNNEL_STAGES)[number], number> {
  const out = {
    applied: 0,
    screening: 0,
    interview: 0,
    offer: 0,
    hired: 0,
  }
  for (const a of apps) {
    const s = a.status as keyof typeof out
    if (s in out) out[s] += 1
  }
  return out
}

export function jobApplicantCounts(jobs: Job[], apps: Application[]): { jobId: number; title: string; count: number }[] {
  const byJob = new Map<number, number>()
  for (const a of apps) {
    byJob.set(a.job_id, (byJob.get(a.job_id) ?? 0) + 1)
  }
  return jobs
    .map(j => ({ jobId: j.id, title: j.title, count: byJob.get(j.id) ?? 0 }))
    .filter(x => x.count > 0)
    .sort((a, b) => b.count - a.count)
}

export function sourceSlicesFromApps(apps: Application[]) {
  const acc: Record<string, number> = {}
  for (const a of apps) {
    const key = a.source_type?.trim() || 'unknown'
    acc[key] = (acc[key] ?? 0) + 1
  }
  return Object.entries(acc)
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1])
}
