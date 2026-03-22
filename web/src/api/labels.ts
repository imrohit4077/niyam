const BASE = '/api/v1'

export interface AccountLabelRow {
  id: number
  account_id: number
  title: string
  description: string | null
  color: string | null
  created_at: string
  updated_at: string
}

function authHeaders(token: string) {
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
}

async function req<T>(path: string, token: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { ...authHeaders(token), ...(options.headers as Record<string, string> ?? {}) },
    ...options,
  })
  const json = await res.json()
  if (!json.success) throw new Error(json.error || 'Request failed')
  return json.data as T
}

export const labelsApi = {
  list: (token: string) => req<AccountLabelRow[]>('/labels', token),

  create: (token: string, body: { title: string; description?: string; color?: string }) =>
    req<AccountLabelRow>('/labels', token, { method: 'POST', body: JSON.stringify(body) }),

  update: (
    token: string,
    id: number,
    body: { title?: string; description?: string | null; color?: string | null },
  ) =>
    req<AccountLabelRow>(`/labels/${id}`, token, { method: 'PATCH', body: JSON.stringify(body) }),

  destroy: (token: string, id: number) =>
    req<{ deleted: boolean }>(`/labels/${id}`, token, { method: 'DELETE' }),

  setJobLabels: (token: string, jobId: number, labelIds: number[]) =>
    req<{ labels: AccountLabelRow[] }>(`/jobs/${jobId}/labels`, token, {
      method: 'PATCH',
      body: JSON.stringify({ label_ids: labelIds }),
    }),

  setApplicationLabels: (token: string, applicationId: number, labelIds: number[]) =>
    req<{ labels: AccountLabelRow[] }>(`/applications/${applicationId}/labels`, token, {
      method: 'PATCH',
      body: JSON.stringify({ label_ids: labelIds }),
    }),
}
