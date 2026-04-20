import type { AuditLogEntry } from '../../api/auditLog'
import { formatDashboardLabel, formatRelativeTime } from './dashboardFormat'

export type DashboardActivityItem = {
  id: number
  title: string
  detail: string
  timeLabel: string
  createdAt: string | null
}

function pathSegments(path: string | null): string[] {
  if (!path) return []
  return path.split('/').filter(Boolean)
}

/** Best-effort human copy for common ATS audit paths. */
export function deriveActivityFromAudit(entries: AuditLogEntry[]): DashboardActivityItem[] {
  const sorted = [...entries].sort((a, b) => {
    const ta = a.created_at ? new Date(a.created_at).getTime() : 0
    const tb = b.created_at ? new Date(b.created_at).getTime() : 0
    return tb - ta
  })
  return sorted
    .filter(e => e.created_at)
    .map(entry => {
      const segs = pathSegments(entry.path)
      const method = (entry.http_method || 'GET').toUpperCase()
      let title = entry.action ? formatDashboardLabel(String(entry.action)) : 'Workspace activity'
      let detail = entry.path || ''

      const appsIdx = segs.indexOf('applications')
      if (appsIdx >= 0) {
        const idSeg = segs[appsIdx + 1]
        const idPart = idSeg && /^\d+$/.test(idSeg) ? `#${idSeg}` : ''
        if (method === 'POST' && segs[appsIdx + 1] === undefined) {
          title = 'Candidate application'
          detail = 'New application submitted or recorded'
        } else if (method === 'PATCH' || method === 'PUT') {
          title = 'Application updated'
          detail = idPart ? `Application ${idPart}` : 'Application record changed'
        } else if (method === 'POST' && segs.includes('interviews')) {
          title = 'Interview activity'
          detail = 'Interview or assignment updated'
        } else {
          title = 'Application activity'
          detail = idPart ? `Application ${idPart}` : entry.path || 'Application'
        }
      } else if (segs.includes('interviews')) {
        title = method === 'POST' ? 'Interview scheduled' : 'Interview updated'
        detail = entry.path || 'Interview'
      } else if (segs.includes('jobs')) {
        const jobIdx = segs.indexOf('jobs')
        const jobId = segs[jobIdx + 1]
        title = method === 'POST' ? 'Job created' : method === 'PATCH' || method === 'PUT' ? 'Job updated' : 'Job activity'
        detail = jobId && /^\d+$/.test(jobId) ? `Job #${jobId}` : entry.path || 'Job'
      } else if (entry.resource) {
        title = formatDashboardLabel(String(entry.resource))
        detail = entry.path || String(entry.action || '')
      }

      const actor = entry.actor_display?.trim()
      if (actor) {
        detail = `${detail}${detail ? ' · ' : ''}${actor}`
      }

      return {
        id: entry.id,
        title,
        detail: detail || '—',
        timeLabel: formatRelativeTime(entry.created_at),
        createdAt: entry.created_at,
      }
    })
}
