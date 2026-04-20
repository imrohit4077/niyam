import type { AuditLogEntry } from '../../api/auditLog'

function pickString(obj: Record<string, unknown> | null | undefined, keys: string[]): string | null {
  if (!obj) return null
  for (const k of keys) {
    const v = obj[k]
    if (typeof v === 'string' && v.trim()) return v.trim()
  }
  return null
}

/** Human-readable copy for the homepage activity feed (best-effort from audit metadata). */
export function formatAuditActivityDescription(entry: AuditLogEntry): string {
  const meta = entry.metadata ?? {}
  const nv = (entry.new_value ?? undefined) as Record<string, unknown> | undefined
  const ov = (entry.old_value ?? undefined) as Record<string, unknown> | undefined
  const resource = (entry.resource || '').toLowerCase()
  const action = (entry.action || '').toLowerCase()
  const path = (entry.path || '').toLowerCase()

  const candidateName =
    pickString(meta, ['candidate_name', 'candidate_email']) ||
    pickString(nv, ['candidate_name', 'candidate_email', 'title']) ||
    pickString(ov, ['candidate_name', 'candidate_email'])

  const jobTitle = pickString(meta, ['job_title', 'title']) || pickString(nv, ['title', 'job_title'])

  if (path.includes('/applications') && path.includes('/stage')) {
    const stage = pickString(nv, ['status', 'stage']) || pickString(meta, ['status', 'stage'])
    if (candidateName && stage) return `Candidate moved to ${stage.replace(/_/g, ' ')} — ${candidateName}`
    if (candidateName) return `Pipeline updated — ${candidateName}`
    return 'Application pipeline stage changed'
  }

  if (path.includes('/interviews') || resource.includes('interview')) {
    if (candidateName) return `Interview activity — ${candidateName}`
    return 'Interview updated'
  }

  if (path.includes('/applications') && (action.includes('create') || entry.http_method === 'POST')) {
    if (candidateName && jobTitle) return `New applicant for ${jobTitle} — ${candidateName}`
    if (candidateName) return `New candidate application — ${candidateName}`
    return 'New application received'
  }

  if (path.includes('/jobs') && (action.includes('create') || entry.http_method === 'POST')) {
    if (jobTitle) return `Job created — ${jobTitle}`
    return 'New job posted'
  }

  if (path.includes('/jobs') && (action.includes('update') || entry.http_method === 'PUT' || entry.http_method === 'PATCH')) {
    if (jobTitle) return `Job updated — ${jobTitle}`
    return 'Job updated'
  }

  if (entry.actor_display) return `${entry.actor_display} — ${entry.resource || 'Workspace activity'}`
  if (entry.resource) return `${formatActionVerb(action)} ${entry.resource}`
  return entry.path ? `Activity: ${entry.path}` : 'Workspace activity'
}

function formatActionVerb(action: string) {
  if (action.includes('destroy') || action.includes('delete')) return 'Removed'
  if (action.includes('create')) return 'Created'
  if (action.includes('update')) return 'Updated'
  return 'Changed'
}

export function formatActivityTime(iso: string | null) {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}
