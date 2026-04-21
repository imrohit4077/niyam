import type { AuditLogEntry } from '../../api/auditLog'
import { formatDashboardLabel } from './dashboardFormat'

function formatRelativeTime(iso: string | null) {
  if (!iso) return ''
  const t = new Date(iso).getTime()
  if (Number.isNaN(t)) return ''
  const diff = Date.now() - t
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}d ago`
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function summarizeEntry(entry: AuditLogEntry): string {
  const action = (entry.action || entry.resource || '').toLowerCase()
  const method = (entry.http_method || '').toUpperCase()
  const path = entry.path || ''

  if (path.includes('/applications') && method === 'POST') return 'New application or candidate record'
  if (path.includes('/applications') && method === 'PATCH') return 'Application updated'
  if (path.includes('/interviews') || path.includes('/interview')) return 'Interview activity'
  if (path.includes('/jobs') && method === 'POST') return 'Job created'
  if (path.includes('/jobs') && (method === 'PUT' || method === 'PATCH')) return 'Job updated'
  if (action.includes('interview')) return formatDashboardLabel(entry.action || 'Interview event')
  if (action.includes('application')) return formatDashboardLabel(entry.action || 'Application event')

  if (entry.resource) return formatDashboardLabel(entry.resource)
  if (entry.path) return `${method} ${path.split('?')[0]}`.slice(0, 72)
  return 'Workspace activity'
}

export function ActivityFeedSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <ul className="dashboard-activity-list" aria-busy="true" aria-label="Loading activity">
      {Array.from({ length: rows }, (_, i) => (
        <li key={i} className="dashboard-activity-item">
          <div className="dashboard-skeleton dashboard-skeleton-activity-title" />
          <div className="dashboard-skeleton dashboard-skeleton-activity-meta" />
        </li>
      ))}
    </ul>
  )
}

export function ActivityFeed({
  entries,
  loading,
  error,
}: {
  entries: AuditLogEntry[]
  loading: boolean
  error: string
}) {
  if (loading) return <ActivityFeedSkeleton />
  if (error) {
    return <div className="dashboard-empty dashboard-activity-error">{error}</div>
  }
  if (entries.length === 0) {
    return <div className="dashboard-empty">No recent activity in the audit log.</div>
  }

  return (
    <ul className="dashboard-activity-list">
      {entries.map(entry => (
        <li key={entry.id} className="dashboard-activity-item">
          <div className="dashboard-activity-main">
            <span className="dashboard-activity-title">{summarizeEntry(entry)}</span>
            {entry.actor_display && <span className="dashboard-activity-actor">{entry.actor_display}</span>}
          </div>
          <time className="dashboard-activity-time" dateTime={entry.created_at ?? undefined}>
            {formatRelativeTime(entry.created_at)}
          </time>
        </li>
      ))}
    </ul>
  )
}
