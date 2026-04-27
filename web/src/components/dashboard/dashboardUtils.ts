import type { Application } from '../../api/applications'
import type { InterviewAssignmentRow } from '../../api/interviews'
import type { Job } from '../../api/jobs'

export const FUNNEL_STAGES = ['applied', 'screening', 'interview', 'offer', 'hired'] as const
export type FunnelStage = (typeof FUNNEL_STAGES)[number]

const FUNNEL_LABELS: Record<FunnelStage, string> = {
  applied: 'Applied',
  screening: 'Screening',
  interview: 'Interview',
  offer: 'Offer',
  hired: 'Hired',
}

export function funnelCountsFromApplications(apps: Application[]): Record<FunnelStage, number> {
  const counts: Record<FunnelStage, number> = {
    applied: 0,
    screening: 0,
    interview: 0,
    offer: 0,
    hired: 0,
  }
  for (const a of apps) {
    const s = a.status as string
    if (s in counts) counts[s as FunnelStage] += 1
  }
  return counts
}

export function funnelChartLabels(): string[] {
  return FUNNEL_STAGES.map(s => FUNNEL_LABELS[s])
}

export function isInCalendarMonth(iso: string, ref: Date) {
  const d = new Date(iso)
  return d.getFullYear() === ref.getFullYear() && d.getMonth() === ref.getMonth()
}

export function pctChange(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null
  return Math.round(((current - previous) / previous) * 100)
}

export function uniqueCandidateCount(apps: Application[]) {
  return new Set(apps.map(a => a.candidate_email.toLowerCase())).size
}

/** Candidates who first applied (by earliest application created_at) in the given calendar month. */
export function newUniqueCandidatesInMonth(apps: Application[], ref: Date) {
  const byEmail = new Map<string, Date>()
  for (const a of apps) {
    const email = a.candidate_email.toLowerCase()
    const t = new Date(a.created_at)
    const prev = byEmail.get(email)
    if (!prev || t < prev) byEmail.set(email, t)
  }
  let n = 0
  for (const d of byEmail.values()) {
    if (isInCalendarMonth(d.toISOString(), ref)) n += 1
  }
  return n
}

export function countJobsCreatedInMonth(jobs: Job[], ref: Date) {
  return jobs.filter(j => isInCalendarMonth(j.created_at, ref)).length
}

export function countInterviewsScheduledInMonth(rows: InterviewAssignmentRow[], ref: Date) {
  return rows.filter(r => r.scheduled_at && isInCalendarMonth(r.scheduled_at, ref)).length
}

export function countOffersTouchedInMonth(apps: Application[], ref: Date) {
  return apps.filter(a => a.status === 'offer' && isInCalendarMonth(a.updated_at, ref)).length
}

export type ActivityItem = {
  id: string
  title: string
  meta: string
  href: string
}

export function buildActivityFeed(
  apps: Application[],
  interviews: InterviewAssignmentRow[],
  accountId: string,
  limit = 14,
): ActivityItem[] {
  type Row = { at: number; item: ActivityItem }
  const rows: Row[] = []

  for (const a of apps) {
    const name = a.candidate_name || a.candidate_email
    rows.push({
      at: new Date(a.created_at).getTime(),
      item: {
        id: `app-created-${a.id}`,
        title: `Candidate applied: ${name}`,
        meta: `New application · ${new Date(a.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
        href: `/account/${accountId}/job-applications/${a.id}`,
      },
    })
    const history = a.stage_history ?? []
    const last = history[history.length - 1]
    const createdMs = new Date(a.created_at).getTime()
    if (last?.changed_at) {
      const changedMs = new Date(last.changed_at).getTime()
      const moved = changedMs > createdMs + 60_000 || last.stage !== a.status
      if (moved) {
        rows.push({
          at: changedMs,
          item: {
            id: `app-stage-${a.id}-${last.changed_at}`,
            title: `Pipeline update: ${name}`,
            meta: `${formatStageLabel(last.stage)} · ${new Date(last.changed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
            href: `/account/${accountId}/job-applications/${a.id}`,
          },
        })
      }
    }
  }

  for (const row of interviews) {
    if (!row.scheduled_at) continue
    const cand = row.application?.candidate_name || row.application?.candidate_email || 'Candidate'
    const jobTitle = row.job?.title ?? 'Role'
    rows.push({
      at: new Date(row.scheduled_at).getTime(),
      item: {
        id: `int-${row.id}-${row.scheduled_at}`,
        title: `Interview scheduled: ${cand}`,
        meta: `${jobTitle} · ${new Date(row.scheduled_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}`,
        href: `/account/${accountId}/interviews`,
      },
    })
  }

  rows.sort((a, b) => b.at - a.at)
  const seen = new Set<string>()
  const out: ActivityItem[] = []
  for (const r of rows) {
    if (seen.has(r.item.id)) continue
    seen.add(r.item.id)
    out.push(r.item)
    if (out.length >= limit) break
  }
  return out
}

function formatStageLabel(stage: string) {
  return stage.replace(/_/g, ' ').replace(/\b\w/g, ch => ch.toUpperCase())
}
