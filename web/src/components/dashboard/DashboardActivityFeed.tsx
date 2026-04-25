import { Link } from 'react-router-dom'
import type { Application } from '../../api/applications'
import type { InterviewAssignmentRow } from '../../api/interviews'
import { formatDashboardLabel } from './dashboardUtils'

export type ActivityItem = {
  id: string
  at: Date
  kind: 'application' | 'interview' | 'offer' | 'hire'
  title: string
  subtitle: string
  href?: string
}

function buildActivities(
  applications: Application[],
  interviews: InterviewAssignmentRow[],
  accountId: string,
  maxItems: number,
): ActivityItem[] {
  const items: ActivityItem[] = []

  for (const app of applications) {
    const base = `/account/${accountId}/applications/${app.id}`
    items.push({
      id: `app-created-${app.id}`,
      at: new Date(app.created_at),
      kind: 'application',
      title: 'Candidate applied',
      subtitle: `${app.candidate_name || app.candidate_email} · ${formatDashboardLabel(app.status)}`,
      href: base,
    })
    const lastStage = app.stage_history?.length ? app.stage_history[app.stage_history.length - 1] : null
    if (lastStage && lastStage.stage !== 'applied') {
      items.push({
        id: `app-stage-${app.id}-${lastStage.changed_at}`,
        at: new Date(lastStage.changed_at),
        kind:
          lastStage.stage === 'hired'
            ? 'hire'
            : lastStage.stage === 'offer'
              ? 'offer'
              : lastStage.stage === 'interview'
                ? 'interview'
                : 'application',
        title: `Moved to ${formatDashboardLabel(lastStage.stage)}`,
        subtitle: `${app.candidate_name || app.candidate_email}`,
        href: base,
      })
    }
  }

  for (const row of interviews) {
    if (!row.scheduled_at && row.status !== 'scheduled' && row.status !== 'pending') continue
    const when = row.scheduled_at ? new Date(row.scheduled_at) : new Date(row.updated_at ?? row.id)
    items.push({
      id: `int-${row.id}`,
      at: when,
      kind: 'interview',
      title: 'Interview scheduled',
      subtitle: `${row.application?.candidate_name || row.application?.candidate_email || 'Candidate'} · ${row.job?.title ?? 'Job'}`,
      href: row.application?.id ? `/account/${accountId}/applications/${row.application.id}` : undefined,
    })
  }

  items.sort((a, b) => b.at.getTime() - a.at.getTime())
  return items.slice(0, maxItems)
}

const KIND_ICON: Record<ActivityItem['kind'], string> = {
  application: '◆',
  interview: '◇',
  offer: '◎',
  hire: '★',
}

const KIND_CLASS: Record<ActivityItem['kind'], string> = {
  application: 'dashboard-activity-icon--blue',
  interview: 'dashboard-activity-icon--indigo',
  offer: 'dashboard-activity-icon--green',
  hire: 'dashboard-activity-icon--teal',
}

export function DashboardActivityFeed({
  applications,
  interviews,
  accountId,
  loading,
  maxItems = 12,
}: {
  applications: Application[]
  interviews: InterviewAssignmentRow[]
  accountId: string
  loading: boolean
  maxItems?: number
}) {
  if (loading) {
    return (
      <div className="dashboard-activity-list" aria-busy>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="dashboard-activity-item dashboard-activity-item--skeleton">
            <div className="dashboard-activity-skel-icon" />
            <div className="dashboard-activity-skel-body">
              <div className="dashboard-activity-skel-line dashboard-activity-skel-line--short" />
              <div className="dashboard-activity-skel-line" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  const items = buildActivities(applications, interviews, accountId, maxItems)

  if (items.length === 0) {
    return <div className="dashboard-empty">No recent activity yet.</div>
  }

  return (
    <ul className="dashboard-activity-list">
      {items.map(item => {
        const time = item.at.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
        const inner = (
          <>
            <span className={`dashboard-activity-icon ${KIND_CLASS[item.kind]}`} aria-hidden>
              {KIND_ICON[item.kind]}
            </span>
            <div className="dashboard-activity-body">
              <div className="dashboard-activity-title-row">
                <strong>{item.title}</strong>
                <time dateTime={item.at.toISOString()}>{time}</time>
              </div>
              <span className="dashboard-activity-subtitle">{item.subtitle}</span>
            </div>
          </>
        )
        return (
          <li key={item.id} className="dashboard-activity-item">
            {item.href ? (
              <Link to={item.href} className="dashboard-activity-link">
                {inner}
              </Link>
            ) : (
              <div className="dashboard-activity-static">{inner}</div>
            )}
          </li>
        )
      })}
    </ul>
  )
}
