import type { AuditLogEntry } from '../../api/auditLog'
import { formatDashboardLabel } from './dashboardFormat'

function pickString(obj: Record<string, unknown> | null | undefined, keys: string[]): string | null {
  if (!obj) return null
  for (const k of keys) {
    const v = obj[k]
    if (typeof v === 'string' && v.trim()) return v.trim()
  }
  return null
}

export function auditEntryToActivityLine(entry: AuditLogEntry): string {
  const meta = entry.metadata && typeof entry.metadata === 'object' ? (entry.metadata as Record<string, unknown>) : {}
  const action = (entry.action || '').toLowerCase()
  const resource = (entry.resource || '').toLowerCase()
  const method = (entry.http_method || '').toUpperCase()

  const candidateName = pickString(meta, ['candidate_name', 'candidate_email', 'name'])
  const jobTitle = pickString(meta, ['job_title', 'title'])
  const actor = entry.actor_display?.trim() || 'Someone'

  if (resource.includes('application') || pathLooksLike(entry.path, 'application')) {
    if (action.includes('create') || method === 'POST') {
      if (candidateName) return `${actor} added candidate ${candidateName}${jobTitle ? ` to ${jobTitle}` : ''}`
      return `${actor} added a new application`
    }
    if (action.includes('update') || action.includes('patch') || method === 'PATCH') {
      const status = pickString(meta, ['status', 'new_status'])
      if (candidateName && status) return `${actor} moved ${candidateName} to ${formatDashboardLabel(status)}`
      if (candidateName) return `${actor} updated application for ${candidateName}`
      return `${actor} updated an application`
    }
  }

  if (resource.includes('interview') || pathLooksLike(entry.path, 'interview')) {
    if (action.includes('create') || method === 'POST') {
      return candidateName ? `${actor} scheduled an interview with ${candidateName}` : `${actor} scheduled an interview`
    }
    return `${actor} updated an interview`
  }

  if (resource.includes('job') || pathLooksLike(entry.path, 'job')) {
    if (action.includes('create') || method === 'POST') return `${actor} created a job${jobTitle ? `: ${jobTitle}` : ''}`
    return `${actor} updated a job${jobTitle ? ` (${jobTitle})` : ''}`
  }

  if (entry.path) {
    const short = entry.path.replace(/^\/api\/v\d+\//, '')
    return `${actor} · ${formatDashboardLabel(short.replace(/\//g, ' '))}`
  }

  return `${actor} performed an action`
}

function pathLooksLike(path: string | null, needle: string) {
  if (!path) return false
  return path.toLowerCase().includes(needle)
}

export function isInterestingAuditEntry(entry: AuditLogEntry): boolean {
  const m = (entry.http_method || '').toUpperCase()
  if (m && !['POST', 'PATCH', 'PUT', 'DELETE'].includes(m)) return false
  if (entry.status_code != null && entry.status_code >= 400) return false
  return true
}
