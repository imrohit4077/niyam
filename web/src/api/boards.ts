const BASE = '/api/v1'

export interface JobBoard {
  id: number
  name: string
  slug: string
  logo_url: string | null
  website_url: string | null
  integration_type: string
  is_active: boolean
  is_premium: boolean
  supports_apply_redirect: boolean
  supports_direct_apply: boolean
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

export const boardsApi = {
  list: (token: string, activeOnly = false) =>
    req<JobBoard[]>(`/job-boards${activeOnly ? '?active=true' : ''}`, token),

  get: (token: string, id: number) =>
    req<JobBoard>(`/job-boards/${id}`, token),

  create: (token: string, data: Partial<JobBoard>) =>
    req<JobBoard>('/job-boards', token, { method: 'POST', body: JSON.stringify(data) }),

  update: (token: string, id: number, data: Partial<JobBoard>) =>
    req<JobBoard>(`/job-boards/${id}`, token, { method: 'PUT', body: JSON.stringify(data) }),

  delete: (token: string, id: number) =>
    req<{ deleted: boolean }>(`/job-boards/${id}`, token, { method: 'DELETE' }),
}
