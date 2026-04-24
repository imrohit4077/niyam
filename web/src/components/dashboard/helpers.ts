import type { Application } from '../../api/applications'
import type { Job } from '../../api/jobs'
import { DASHBOARD_CHART_COLORS } from './constants'

export type DashboardSlice = {
  key: string
  label: string
  value: number
  color: string
}

export function formatDashboardLabel(value: string) {
  return value.replace(/_/g, ' ').replace(/\b\w/g, ch => ch.toUpperCase())
}

export function makeDashboardSlices(entries: Array<[string, number]>) {
  return entries
    .filter(([, value]) => value > 0)
    .map(([label, value], index) => ({
      key: label,
      label: formatDashboardLabel(label),
      value,
      color: DASHBOARD_CHART_COLORS[index % DASHBOARD_CHART_COLORS.length],
    }))
}

export type TrendDirection = 'up' | 'down' | 'flat'

export type TrendResult = {
  direction: TrendDirection
  /** Rounded percentage vs previous period; 0 if flat or undefined */
  percent: number
}

/** Month-over-month percent change; caps display magnitude */
export function monthOverMonthPercent(current: number, previous: number): TrendResult {
  if (previous === 0) {
    if (current === 0) return { direction: 'flat', percent: 0 }
    return { direction: 'up', percent: 100 }
  }
  const raw = ((current - previous) / previous) * 100
  const rounded = Math.round(raw * 10) / 10
  const capped = Math.min(Math.abs(rounded), 999)
  if (rounded > 0.05) return { direction: 'up', percent: capped }
  if (rounded < -0.05) return { direction: 'down', percent: capped }
  return { direction: 'flat', percent: 0 }
}

export function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1)
}

export function isDateInMonth(iso: string, year: number, monthIndex: number) {
  const t = new Date(iso).getTime()
  const start = new Date(year, monthIndex, 1).getTime()
  const end = new Date(year, monthIndex + 1, 1).getTime()
  return t >= start && t < end
}

export function countJobsCreatedInMonth(jobs: Job[], year: number, monthIndex: number) {
  return jobs.filter(j => isDateInMonth(j.created_at, year, monthIndex)).length
}

export function countInterviewsCreatedInMonth(
  interviews: { created_at: string }[],
  year: number,
  monthIndex: number,
) {
  return interviews.filter(i => isDateInMonth(i.created_at, year, monthIndex)).length
}

/** First time application reached offer per stage_history, else null */
export function firstOfferChangedAt(app: Application): string | null {
  const h = app.stage_history ?? []
  const offer = h.find(x => x.stage === 'offer')
  return offer?.changed_at ?? null
}

export function countOffersReleasedInMonth(apps: Application[], year: number, monthIndex: number) {
  let n = 0
  for (const app of apps) {
    const at = firstOfferChangedAt(app)
    if (at && isDateInMonth(at, year, monthIndex)) n += 1
  }
  return n
}

/** Cumulative funnel counts across workspace */
export function workspacePipelineFunnelCounts(apps: Application[]) {
  let hired = 0
  let offer = 0
  let interview = 0
  let screening = 0
  for (const app of apps) {
    const s = app.status
    if (s === 'hired') hired += 1
    if (s === 'offer' || s === 'hired') offer += 1
    if (s === 'interview' || s === 'offer' || s === 'hired') interview += 1
    if (s === 'screening' || s === 'interview' || s === 'offer' || s === 'hired') screening += 1
  }
  const applied = apps.length
  return { applied, screening, interview, offer, hired }
}

export function dominantApplicantStatus(apps: Application[]): string {
  if (apps.length === 0) return '—'
  const tally: Record<string, number> = {}
  for (const a of apps) {
    tally[a.status] = (tally[a.status] ?? 0) + 1
  }
  let best = ''
  let bestN = -1
  for (const [k, v] of Object.entries(tally)) {
    if (v > bestN) {
      bestN = v
      best = k
    }
  }
  if (!best) return '—'
  return formatDashboardLabel(best)
}
