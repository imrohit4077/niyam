import { Link } from 'react-router-dom'
import type { AuditLogEntry } from '../../api/auditLog'
import { auditEntryToActivityLine, isInterestingAuditEntry } from './dashboardActivity'
import { formatRelativeTime } from './dashboardFormat'
import { DashboardErrorRow } from './DashboardStates'
import { DashboardLoadingRow } from './DashboardStates'

export function DashboardActivityFeed({
  loading,
  error,
  entries,
  accountId,
}: {
  loading: boolean
  error: string
  entries: AuditLogEntry[]
  accountId: string
}) {
  const rows = entries.filter(isInterestingAuditEntry).slice(0, 12)

  return (
    <div className="dashboard-activity">
      {loading ? (
        <DashboardLoadingRow />
      ) : error ? (
        <DashboardErrorRow msg={error} />
      ) : rows.length === 0 ? (
        <div className="dashboard-empty">No recent activity yet.</div>
      ) : (
        <ul className="dashboard-activity-list">
          {rows.map(entry => (
            <li key={entry.id} className="dashboard-activity-item">
              <span className="dashboard-activity-dot" aria-hidden />
              <div className="dashboard-activity-body">
                <p className="dashboard-activity-text">{auditEntryToActivityLine(entry)}</p>
                <time className="dashboard-activity-time" dateTime={entry.created_at ?? undefined}>
                  {formatRelativeTime(entry.created_at)}
                </time>
              </div>
            </li>
          ))}
        </ul>
      )}
      <div className="dashboard-panel-footer">
        <Link className="dashboard-link" to={`/account/${accountId}/settings/audit-compliance/audit-logs`}>
          View all activity
        </Link>
      </div>
    </div>
  )
}
