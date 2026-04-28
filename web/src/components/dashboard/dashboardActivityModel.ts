import type { Application } from '../../api/applications'
import type { InterviewAssignmentRow } from '../../api/interviews'
import { formatDashboardLabel, formatDateTimeShort } from './dashboardFormat'

export type ActivityItem = {
  id: string
  kind: 'application' | 'interview' | 'offer' | 'hired'
  title: string
  subtitle: string
  /** Human-readable timestamp for display */
  meta: string
  /** ISO string for sorting (newest first) */
  sortAt: string
  statusLabel: string
  statusKey: string
  href?: string
}

function applicationToActivities(app: Application, accountId: string): ActivityItem[] {
  const baseName = app.candidate_name || app.candidate_email
  const href = `/account/${accountId}/job-applications/${app.id}`
  const created: ActivityItem = {
    id: `app-${app.id}-created`,
    kind: 'application',
    title: 'Candidate applied',
    subtitle: baseName,
    meta: new Date(app.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    sortAt: app.created_at,
    statusLabel: formatDashboardLabel(app.status),
    statusKey: app.status,
    href,
  }
  const history = [...(app.stage_history ?? [])].sort(
    (a, b) => new Date(b.changed_at).getTime() - new Date(a.changed_at).getTime(),
  )
  const latest = history[0]
  const effectiveStage = latest?.stage && latest.stage !== 'applied' ? latest.stage : app.status !== 'applied' ? app.status : null
  if (!effectiveStage || effectiveStage === 'applied') return [created]

  const kind: ActivityItem['kind'] =
    effectiveStage === 'hired'
      ? 'hired'
      : effectiveStage === 'offer'
        ? 'offer'
        : effectiveStage === 'interview'
          ? 'interview'
          : 'application'

  const title =
    kind === 'hired'
      ? 'Candidate hired'
      : kind === 'offer'
        ? 'Moved to offer'
        : kind === 'interview'
          ? 'Stage: interview'
          : 'Pipeline update'

  const sortAt = latest && latest.stage === effectiveStage ? latest.changed_at : app.updated_at

  return [
    {
      id: `app-${app.id}-stage`,
      kind,
      title,
      subtitle: baseName,
      meta: new Date(sortAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }),
      sortAt,
      statusLabel: formatDashboardLabel(effectiveStage),
      statusKey: effectiveStage,
      href,
    },
    created,
  ]
}

function interviewToActivity(row: InterviewAssignmentRow, accountId: string): ActivityItem | null {
  if (!row.scheduled_at) return null
  const name = row.application?.candidate_name || row.application?.candidate_email || 'Candidate'
  const jobTitle = row.job?.title ?? 'Role'
  return {
    id: `int-${row.id}`,
    kind: 'interview',
    title: 'Interview scheduled',
    subtitle: `${name} · ${jobTitle}`,
    meta: formatDateTimeShort(row.scheduled_at),
    sortAt: row.scheduled_at,
    statusLabel: formatDashboardLabel(row.status),
    statusKey: row.status,
    href: `/account/${accountId}/interviews`,
  }
}

export function buildActivityFeed(
  applications: Application[],
  interviews: InterviewAssignmentRow[],
  accountId: string,
  limit = 12,
): ActivityItem[] {
  const fromApps = applications.flatMap(a => applicationToActivities(a, accountId))
  const fromInt = interviews
    .map(r => interviewToActivity(r, accountId))
    .filter((x): x is ActivityItem => x != null)

  const merged = [...fromApps, ...fromInt].sort((a, b) => {
    const ta = new Date(a.sortAt).getTime()
    const tb = new Date(b.sortAt).getTime()
    return tb - ta
  })

  const seen = new Set<string>()
  const deduped: ActivityItem[] = []
  for (const item of merged) {
    if (seen.has(item.id)) continue
    seen.add(item.id)
    deduped.push(item)
    if (deduped.length >= limit) break
  }
  return deduped
}
