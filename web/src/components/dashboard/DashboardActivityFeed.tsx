import type { AuditLogEntryRow } from '../../api/accountAudit'
import { formatDashboardLabel, formatRelativeTime } from './dashboardUtils'

type Props = {
  entries: AuditLogEntryRow[]
  loading: boolean
  error: string
}

function describeEntry(row: AuditLogEntryRow): string {
  const action = (row.action || row.resource_type || 'Activity').replace(/_/g, ' ')
  const resource = row.resource ? formatDashboardLabel(row.resource) : row.resource_type ? formatDashboardLabel(row.resource_type) : ''
  const bits = [formatDashboardLabel(action), resource].filter(Boolean)
  return bits.join(' · ') || 'Workspace activity'
}

export function DashboardActivityFeed({ entries, loading, error }: Props) {
  if (loading) {
    return (
      <ul className="dashboard-activity-list" aria-busy="true">
        {Array.from({ length: 5 }, (_, i) => (
          <li key={i} className="dashboard-activity-item">
            <span className="dashboard-activity-dot dashboard-skeleton" style={{ borderRadius: '50%' }} />
            <div className="dashboard-activity-body">
              <span className="dashboard-skeleton dashboard-skeleton--text-md" />
              <span className="dashboard-skeleton dashboard-skeleton--text-xs" />
            </div>
          </li>
        ))}
      </ul>
    )
  }

  if (error) {
    return <div className="dashboard-empty dashboard-empty--error">{error}</div>
  }

  if (entries.length === 0) {
    return <div className="dashboard-empty">No recent activity yet.</div>
  }

  return (
    <ul className="dashboard-activity-list">
      {entries.map(row => (
        <li key={row.id} className="dashboard-activity-item">
          <span className="dashboard-activity-dot" aria-hidden />
          <div className="dashboard-activity-body">
            <p className="dashboard-activity-title">{describeEntry(row)}</p>
            <span className="dashboard-activity-meta">{formatRelativeTime(row.created_at)}</span>
          </div>
        </li>
      ))}
    </ul>
  )
}
