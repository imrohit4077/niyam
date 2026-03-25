const BASE = '/api/v1'

export type AuditComplianceDoc = {
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
  stats: { total_entries: number }
}

export type AuditLogEntryRow = {
  id: number
  account_id: number
  actor_user_id: number | null
  http_method: string | null
  path: string | null
  status_code: number | null
  resource_type: string | null
  resource_id: number | null
  metadata: Record<string, unknown>
  ip_address: string | null
  user_agent: string | null
  action: string | null
  resource: string | null
  severity: string | null
  old_value: Record<string, unknown> | null
  new_value: Record<string, unknown> | null
  created_at: string
}

async function getJson<T>(path: string, token: string): Promise<{ data: T; meta?: Record<string, number> }> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  const json = await res.json()
  if (!json.success) throw new Error(json.error || 'Request failed')
  return { data: json.data as T, meta: json.meta as Record<string, number> | undefined }
}

export function getAuditCompliance(token: string) {
  return getJson<AuditComplianceDoc>('/account/audit_compliance', token).then(r => r.data)
}

export function getAuditLog(
  token: string,
  params?: { page?: number; per_page?: number; q?: string },
) {
  const sp = new URLSearchParams()
  if (params?.page) sp.set('page', String(params.page))
  if (params?.per_page) sp.set('per_page', String(params.per_page))
  if (params?.q) sp.set('q', params.q)
  const q = sp.toString()
  return getJson<AuditLogEntryRow[]>(`/account/audit_log${q ? `?${q}` : ''}`, token).then(r => ({
    entries: r.data,
    meta: r.meta,
  }))
}
