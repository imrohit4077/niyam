import type { AuditLogEntry } from '../../api/auditLog'

export function auditLogSummary(row: AuditLogEntry): string {
  const m = row.metadata || {}
  const s = typeof m.summary === 'string' ? m.summary.trim() : ''
  if (s) return s
  return (row.action && String(row.action)) || 'Activity'
}

export function auditLogTimeShort(iso: string | null): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  } catch {
    return iso
  }
}
