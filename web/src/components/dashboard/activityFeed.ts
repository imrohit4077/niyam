import type { Application } from '../../api/applications'
import type { InterviewAssignmentRow } from '../../api/interviews'
import { formatDashboardLabel } from './dashboardUtils'

export type ActivityEvent = {
  id: string
  at: number
  title: string
  detail: string
  kind: 'apply' | 'stage' | 'interview'
}

function truncate(s: string, n: number) {
  if (s.length <= n) return s
  return `${s.slice(0, n - 1)}…`
}

export function buildActivityFeed(
  applications: Application[],
  interviews: InterviewAssignmentRow[],
  max = 12,
): ActivityEvent[] {
  const out: ActivityEvent[] = []

  const recentApps = [...applications]
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    .slice(0, 120)

  for (const app of recentApps) {
    const name = truncate(app.candidate_name || app.candidate_email || 'Candidate', 42)
    const created = new Date(app.created_at).getTime()
    if (!Number.isNaN(created)) {
      out.push({
        id: `app-${app.id}-created`,
        at: created,
        title: 'Application received',
        detail: `${name} · Job #${app.job_id}`,
        kind: 'apply',
      })
    }
    const history = app.stage_history ?? []
    for (let i = 0; i < history.length; i++) {
      const h = history[i]
      const t = new Date(h.changed_at).getTime()
      if (Number.isNaN(t)) continue
      out.push({
        id: `app-${app.id}-stage-${i}-${h.changed_at}`,
        at: t,
        title: 'Stage updated',
        detail: `${name} → ${formatDashboardLabel(h.stage)}`,
        kind: 'stage',
      })
    }
  }

  const recentInt = [...interviews]
    .sort((a, b) => {
      const ta = new Date(a.scheduled_at ?? a.created_at).getTime()
      const tb = new Date(b.scheduled_at ?? b.created_at).getTime()
      return tb - ta
    })
    .slice(0, 40)

  for (const row of recentInt) {
    const name = truncate(row.application?.candidate_name || row.application?.candidate_email || 'Candidate', 42)
    const jobTitle = truncate(row.job?.title ?? `Job #${row.application?.job_id ?? '—'}`, 36)
    const t = row.scheduled_at
      ? new Date(row.scheduled_at).getTime()
      : new Date(row.created_at).getTime()
    if (Number.isNaN(t)) continue
    out.push({
      id: `int-${row.id}`,
      at: t,
      title: row.scheduled_at ? 'Interview scheduled' : 'Interview activity',
      detail: `${name} · ${jobTitle}`,
      kind: 'interview',
    })
  }

  out.sort((a, b) => b.at - a.at)
  return out.slice(0, max)
}
