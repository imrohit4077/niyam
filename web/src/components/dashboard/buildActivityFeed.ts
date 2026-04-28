import type { Application } from '../../api/applications'
import type { InterviewAssignmentRow } from '../../api/interviews'
import type { Job } from '../../api/jobs'

export type ActivityFeedItem = {
  id: string
  at: string
  headline: string
  detail: string
  accent: 'candidate' | 'interview' | 'stage' | 'neutral'
}

function jobTitle(jobs: Job[], jobId: number) {
  return jobs.find(j => j.id === jobId)?.title ?? `Job #${jobId}`
}

function formatName(app: Application) {
  return app.candidate_name?.trim() || app.candidate_email || 'Candidate'
}

function formatStage(stage: string) {
  return stage.replace(/_/g, ' ')
}

export function buildActivityFeed(
  applications: Application[],
  interviews: InterviewAssignmentRow[],
  jobs: Job[],
  limit = 16,
): ActivityFeedItem[] {
  const items: ActivityFeedItem[] = []

  const appsByCreated = [...applications].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  )
  for (const app of appsByCreated.slice(0, 12)) {
    const jt = jobTitle(jobs, app.job_id)
    items.push({
      id: `app-new-${app.id}`,
      at: app.created_at,
      headline: 'Candidate added',
      detail: `${formatName(app)} · ${jt}`,
      accent: 'candidate',
    })
  }

  const appsByUpdated = [...applications].sort(
    (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
  )
  for (const app of appsByUpdated.slice(0, 10)) {
    const jt = jobTitle(jobs, app.job_id)
    const hist = app.stage_history ?? []
    const last = hist.length ? hist[hist.length - 1] : null
    if (last && new Date(last.changed_at).getTime() > new Date(app.created_at).getTime() + 60_000) {
      items.push({
        id: `app-stage-${app.id}-${last.changed_at}`,
        at: last.changed_at,
        headline: `Stage: ${formatStage(last.stage)}`,
        detail: `${formatName(app)} · ${jt}`,
        accent: 'stage',
      })
    }
  }

  const intSorted = [...interviews].sort((a, b) => {
    const ta = new Date(a.scheduled_at || a.updated_at).getTime()
    const tb = new Date(b.scheduled_at || b.updated_at).getTime()
    return tb - ta
  })
  for (const row of intSorted.slice(0, 12)) {
    const name = row.application?.candidate_name || row.application?.candidate_email || 'Candidate'
    const jt = row.job?.title ?? (row.application?.job_id != null ? jobTitle(jobs, row.application.job_id) : 'Interview')
    const at = row.scheduled_at || row.updated_at
    const headline =
      row.scheduled_at && (row.status === 'scheduled' || row.status === 'pending')
        ? 'Interview scheduled'
        : `Interview ${row.status.replace(/_/g, ' ')}`
    items.push({
      id: `int-${row.id}-${at}`,
      at,
      headline,
      detail: `${name} · ${jt}`,
      accent: 'interview',
    })
  }

  items.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())

  const out: ActivityFeedItem[] = []
  const seen = new Set<string>()
  for (const it of items) {
    const key = `${it.id}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push(it)
    if (out.length >= limit) break
  }
  return out
}
