import { Link } from 'react-router-dom'
import type { AuditLogEntry } from '../../api/auditLog'
import { formatDashboardLabel } from './dashboardUtils'

function formatFeedTime(iso: string | null) {
  if (!iso) return ''
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function entrySummary(entry: AuditLogEntry): string {
  if (entry.action && entry.resource) {
    return `${formatDashboardLabel(entry.action)} · ${formatDashboardLabel(entry.resource)}`
  }
  if (entry.path) {
    const short = entry.path.replace(/^\/api\/v1\/?/, '')
    return short.length > 48 ? `${short.slice(0, 46)}…` : short
  }
  return 'Workspace activity'
}

type ActivityFeedProps = {
  entries: AuditLogEntry[]
  loading: boolean
  error: string
  accountId: string
}

export function ActivityFeedSkeleton() {
  return (
    <ul className="dashboard-activity-list" aria-busy="true">
      {Array.from({ length: 5 }).map((_, i) => (
        <li key={i} className="dashboard-activity-item dashboard-activity-item--skeleton">
          <span className="dashboard-activity-skel-line dashboard-activity-skel-line--wide" />
          <span className="dashboard-activity-skel-line dashboard-activity-skel-line--narrow" />
        </li>
      ))}
    </ul>
  )
}

export function ActivityFeed({ entries, loading, error, accountId }: ActivityFeedProps) {
  if (loading) {
    return <ActivityFeedSkeleton />
  }
  if (error) {
    return <div className="dashboard-empty dashboard-empty--left">{error}</div>
  }
  if (entries.length === 0) {
    return (
      <div className="dashboard-empty dashboard-empty--left">
        No recent activity. Actions from your workspace will appear here when audit logging is enabled.
      </div>
    )
  }
  return (
    <ul className="dashboard-activity-list">
      {entries.map(entry => (
        <li key={entry.id} className="dashboard-activity-item">
          <div className="dashboard-activity-dot" aria-hidden />
          <div className="dashboard-activity-body">
            <p className="dashboard-activity-title">{entrySummary(entry)}</p>
            <div className="dashboard-activity-meta">
              <span>{formatFeedTime(entry.created_at)}</span>
              {entry.actor_display ? <span>{entry.actor_display}</span> : null}
            </div>
          </div>
        </li>
      ))}
      <li className="dashboard-activity-footer">
        <Link className="dashboard-link dashboard-link--quiet" to={`/account/${accountId}/settings/audit-compliance/audit-logs`}>
          View all activity
        </Link>
      </li>
    </ul>
  )
}
