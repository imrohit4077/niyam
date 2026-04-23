import type { Application } from '../../api/applications'
import type { InterviewAssignmentRow } from '../../api/interviews'
import type { Job } from '../../api/jobs'
import { formatDashboardLabel } from './chartUtils'

export type ActivityKind = 'apply' | 'interview' | 'hire' | 'offer' | 'other'

export type ActivityFeedItem = {
  id: string
  at: string
  title: string
  subtitle: string
  kind: ActivityKind
}

function jobTitle(jobsById: Map<number, Job>, jobId: number) {
  return jobsById.get(jobId)?.title ?? `Job #${jobId}`
}

export function buildActivityFeed(
  applications: Application[],
  interviews: InterviewAssignmentRow[],
  jobsById: Map<number, Job>,
  limit = 12,
): ActivityFeedItem[] {
  const items: ActivityFeedItem[] = []

  for (const app of applications) {
    const name = app.candidate_name || app.candidate_email || 'Candidate'
    const jt = jobTitle(jobsById, app.job_id)
    items.push({
      id: `app-created-${app.id}`,
      at: app.created_at,
      title: `${name} applied`,
      subtitle: jt,
      kind: 'apply',
    })
    if (app.status === 'hired' && app.updated_at && app.updated_at !== app.created_at) {
      items.push({
        id: `app-hired-${app.id}`,
        at: app.updated_at,
        title: `${name} marked hired`,
        subtitle: jt,
        kind: 'hire',
      })
    } else if (app.status === 'offer' && app.updated_at) {
      items.push({
        id: `app-offer-${app.id}`,
        at: app.updated_at,
        title: `${name} in offer stage`,
        subtitle: jt,
        kind: 'offer',
      })
    }
  }

  for (const row of interviews) {
    const name = row.application?.candidate_name || row.application?.candidate_email || 'Candidate'
    const jid = row.application?.job_id ?? row.job?.id
    const jt = jid != null ? jobTitle(jobsById, jid) : row.job?.title ?? 'Interview'
    if (row.scheduled_at) {
      items.push({
        id: `int-sched-${row.id}`,
        at: row.scheduled_at,
        title: 'Interview scheduled',
        subtitle: `${name} · ${jt}`,
        kind: 'interview',
      })
    } else {
      items.push({
        id: `int-assigned-${row.id}`,
        at: row.created_at,
        title: 'Interview assignment created',
        subtitle: `${name} · ${jt}`,
        kind: 'interview',
      })
    }
  }

  items.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())

  const seen = new Set<string>()
  const deduped: ActivityFeedItem[] = []
  for (const it of items) {
    const key = `${it.id}-${it.at}`
    if (seen.has(key)) continue
    seen.add(key)
    deduped.push(it)
    if (deduped.length >= limit) break
  }

  return deduped.slice(0, limit)
}

export function activityKindLabel(kind: ActivityKind) {
  switch (kind) {
    case 'apply':
      return 'Application'
    case 'interview':
      return 'Interview'
    case 'hire':
      return 'Hire'
    case 'offer':
      return 'Offer'
    default:
      return formatDashboardLabel(kind)
  }
}
