import type { Application } from '../../api/applications'
import type { InterviewAssignmentRow } from '../../api/interviews'
import type { Job } from '../../api/jobs'

export type ActivityKind = 'candidate_added' | 'interview_scheduled' | 'offer_released' | 'hired' | 'stage_change'

export type ActivityFeedItem = {
  id: string
  kind: ActivityKind
  title: string
  subtitle: string
  at: string
  href?: string
}

function maxTime(a: string | null | undefined, b: string | null | undefined) {
  const ta = a ? new Date(a).getTime() : 0
  const tb = b ? new Date(b).getTime() : 0
  return ta >= tb ? a || b || '' : b || a || ''
}

export function buildActivityFeed(
  applications: Application[],
  interviews: InterviewAssignmentRow[],
  accountId: string,
  jobs: Job[],
  limit = 14,
): ActivityFeedItem[] {
  const jobTitle = (jobId: number) => jobs.find(j => j.id === jobId)?.title ?? `Job #${jobId}`
  const items: ActivityFeedItem[] = []

  for (const app of applications) {
    const name = app.candidate_name || app.candidate_email
    items.push({
      id: `app-created-${app.id}`,
      kind: 'candidate_added',
      title: `Candidate added: ${name}`,
      subtitle: jobTitle(app.job_id),
      at: app.created_at,
      href: `/account/${accountId}/job-applications/${app.id}`,
    })

    const lastStage = app.stage_history?.length
      ? app.stage_history[app.stage_history.length - 1]
      : null
    if (lastStage && lastStage.stage !== 'applied') {
      items.push({
        id: `app-stage-${app.id}-${lastStage.changed_at}`,
        kind: 'stage_change',
        title: `Moved to ${lastStage.stage.replace(/_/g, ' ')}: ${name}`,
        subtitle: jobTitle(app.job_id),
        at: lastStage.changed_at,
        href: `/account/${accountId}/job-applications/${app.id}`,
      })
    }

    if (app.status === 'offer') {
      items.push({
        id: `app-offer-${app.id}`,
        kind: 'offer_released',
        title: `Offer stage: ${name}`,
        subtitle: jobTitle(app.job_id),
        at: maxTime(app.updated_at, app.created_at),
        href: `/account/${accountId}/job-applications/${app.id}`,
      })
    }
    if (app.status === 'hired') {
      items.push({
        id: `app-hired-${app.id}`,
        kind: 'hired',
        title: `Hired: ${name}`,
        subtitle: jobTitle(app.job_id),
        at: maxTime(app.updated_at, app.created_at),
        href: `/account/${accountId}/job-applications/${app.id}`,
      })
    }
  }

  for (const row of interviews) {
    const when = row.scheduled_at || row.created_at
    const cand =
      row.application?.candidate_name || row.application?.candidate_email || 'Candidate'
    const jobTitle = row.job?.title ?? `Job #${row.application?.job_id ?? '—'}`
    if (row.scheduled_at || row.status === 'scheduled' || row.status === 'pending') {
      items.push({
        id: `int-${row.id}`,
        kind: 'interview_scheduled',
        title: `Interview ${row.scheduled_at ? 'scheduled' : 'updated'}: ${cand}`,
        subtitle: jobTitle,
        at: when,
        href: `/account/${accountId}/interviews`,
      })
    }
  }

  items.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())

  const seen = new Set<string>()
  const deduped: ActivityFeedItem[] = []
  for (const row of items) {
    if (seen.has(row.id)) continue
    seen.add(row.id)
    deduped.push(row)
    if (deduped.length >= limit) break
  }
  return deduped
}
