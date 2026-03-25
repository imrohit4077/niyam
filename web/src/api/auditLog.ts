const BASE = '/api/v1'

export interface AuditLogEntry {
  id: number
  actor_user_id: number | null
  actor_display?: string | null
  http_method: string | null
  path: string | null
  status_code: number | null
  action?: string | null
  resource?: string | null
  severity?: string | null
  metadata: Record<string, unknown>
  ip_address: string | null
  user_agent: string | null
  request_id?: string | null
  log_category?: string | null
  event_source?: string | null
  old_value?: Record<string, unknown> | null
  new_value?: Record<string, unknown> | null
  created_at: string | null
}

export interface AuditLogMeta {
  page: number
  per_page: number
  total: number
  total_pages: number
  last_page?: number
  has_next: boolean
  has_prev: boolean
}

export interface AuditTrailActionType {
  code: string
  label: string
  http_verbs: string[]
  description: string
}

export interface AuditLogStreamInfo {
  code: string
  label: string
  description: string
}

export interface AuditTrailSettingsPayload {
  track_mutations: boolean
  track_sensitive_reads: boolean
  track_all_reads: boolean
  /** @deprecated maps to track_all_reads */
  track_read_requests: boolean
  action_types: AuditTrailActionType[]
  log_streams: AuditLogStreamInfo[]
}

export interface AuditComplianceDoc {
  title: string
  summary: string
  write_only: {
    heading: string
    body: string
    bullets: string[]
  }
  operations: {
    heading: string
    bullets: string[]
  }
  audit_trail?: AuditTrailSettingsPayload
  stats: { total_entries: number }
}

export async function getAuditCompliance(token: string): Promise<AuditComplianceDoc> {
  const res = await fetch(`${BASE}/account/audit_compliance`, {
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  })
  const json = await res.json()
  if (!json.success) throw new Error(json.error || 'Request failed')
  return json.data as AuditComplianceDoc
}

export async function patchAuditTrailSettings(
  token: string,
  body: Partial<
    Pick<
      AuditTrailSettingsPayload,
      'track_read_requests' | 'track_mutations' | 'track_sensitive_reads' | 'track_all_reads'
    >
  >,
): Promise<{
  track_mutations: boolean
  track_sensitive_reads: boolean
  track_all_reads: boolean
  track_read_requests: boolean
}> {
  const res = await fetch(`${BASE}/account/audit_trail_settings`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const json = await res.json()
  if (!json.success) throw new Error(json.error || 'Request failed')
  return json.data as {
    track_mutations: boolean
    track_sensitive_reads: boolean
    track_all_reads: boolean
    track_read_requests: boolean
  }
}

export async function getAuditLog(
  token: string,
  params: { page?: number; per_page?: number; q?: string; log_category?: string } = {},
): Promise<{ entries: AuditLogEntry[]; meta: AuditLogMeta }> {
  const sp = new URLSearchParams()
  if (params.page) sp.set('page', String(params.page))
  if (params.per_page) sp.set('per_page', String(params.per_page))
  if (params.q) sp.set('path_contains', params.q)
  if (params.log_category) sp.set('log_category', params.log_category)
  const q = sp.toString()
  const res = await fetch(`${BASE}/account/audit_log${q ? `?${q}` : ''}`, {
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  })
  const json = await res.json()
  if (!json.success) throw new Error(json.error || 'Request failed')
  return {
    entries: json.data as AuditLogEntry[],
    meta: json.meta as AuditLogMeta,
  }
}

export interface AuditDeliveryFailureRow {
  id: number
  account_id: number
  actor_user_id: number | null
  attempted_payload: Record<string, unknown>
  error_message: string
  celery_task_id: string | null
  created_at: string | null
}

export async function getAuditDeliveryFailures(
  token: string,
  params: { page?: number; per_page?: number } = {},
): Promise<{ entries: AuditDeliveryFailureRow[]; meta: AuditLogMeta }> {
  const sp = new URLSearchParams()
  if (params.page) sp.set('page', String(params.page))
  if (params.per_page) sp.set('per_page', String(params.per_page))
  const q = sp.toString()
  const res = await fetch(`${BASE}/account/audit_log_failures${q ? `?${q}` : ''}`, {
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  })
  const json = await res.json()
  if (!json.success) throw new Error(json.error || 'Request failed')
  return {
    entries: json.data as AuditDeliveryFailureRow[],
    meta: json.meta as AuditLogMeta,
  }
}
