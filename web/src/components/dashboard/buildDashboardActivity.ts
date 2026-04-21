import type { Application } from '../../api/applications'
import type { InterviewAssignmentRow } from '../../api/interviews'
import type { Job } from '../../api/jobs'
import { formatDashboardLabel } from './dashboardUtils'

export type DashboardActivityItem = {
  id: string
  at: string
  kind: 'apply' | 'interview' | 'stage' | 'hire' | 'offer' | 'reject'
  title: string
  subtitle: string
}

function jobTitle(jobs: Job[], jobId: number) {
  return jobs.find(j => j.id === jobId)?.title ?? `Job #${jobId}`
}

function candidateLabel(app: Application) {
  return app.candidate_name?.trim() || app.candidate_email || 'Candidate'
}

export function buildDashboardActivity(
  applications: Application[],
  interviews: InterviewAssignmentRow[],
  jobs: Job[],
  limit = 14,
): DashboardActivityItem[] {
  const items: DashboardActivityItem[] = []

  for (const app of applications) {
    const jt = jobTitle(jobs, app.job_id)
    const who = candidateLabel(app)
    items.push({
      id: `app-${app.id}-created`,
      at: app.created_at,
      kind: 'apply',
      title: `${who} applied`,
      subtitle: jt,
    })

    const history = app.stage_history ?? []
    for (let i = 0; i < history.length; i++) {
      const row = history[i]
      const stage = formatDashboardLabel(row.stage)
      const prev = i > 0 ? history[i - 1].stage : null
      if (prev === row.stage) continue
      let kind: DashboardActivityItem['kind'] = 'stage'
      if (row.stage === 'hired') kind = 'hire'
      else if (row.stage === 'offer') kind = 'offer'
      else if (row.stage === 'rejected' || row.stage === 'withdrawn') kind = 'reject'
      items.push({
        id: `app-${app.id}-stage-${i}-${row.changed_at}`,
        at: row.changed_at,
        kind,
        title: `${who} → ${stage}`,
        subtitle: jt,
      })
    }

    if (history.length === 0) {
      const st = app.status
      if (st !== 'applied') {
        let kind: DashboardActivityItem['kind'] = 'stage'
        if (st === 'hired') kind = 'hire'
        else if (st === 'offer') kind = 'offer'
        else if (st === 'rejected' || st === 'withdrawn') kind = 'reject'
        items.push({
          id: `app-${app.id}-status`,
          at: app.updated_at,
          kind,
          title: `${who} → ${formatDashboardLabel(st)}`,
          subtitle: jt,
        })
      }
    }
  }

  for (const row of interviews) {
    const app = row.application
    const when = row.scheduled_at || row.created_at
    if (!when) continue
    const who = app?.candidate_name?.trim() || app?.candidate_email || 'Candidate'
    const jt = row.job?.title ?? (app ? jobTitle(jobs, app.job_id) : 'Interview')
    items.push({
      id: `int-${row.id}`,
      at: when,
      kind: 'interview',
      title: `Interview ${row.scheduled_at ? 'scheduled' : 'created'}`,
      subtitle: `${who} · ${jt}`,
    })
  }

  items.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())

  const seen = new Set<string>()
  const deduped: DashboardActivityItem[] = []
  for (const it of items) {
    const key = `${it.kind}|${it.title}|${it.subtitle}|${it.at.slice(0, 16)}`
    if (seen.has(key)) continue
    seen.add(key)
    deduped.push(it)
    if (deduped.length >= limit) break
  }

  return deduped
}
