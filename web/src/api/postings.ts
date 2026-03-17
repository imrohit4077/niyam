const BASE = '/api/v1'

export interface JobPosting {
  id: number
  account_id: number
  job_id: number
  board_id: number
  status: string
  external_url: string | null
  external_apply_url: string | null
  posted_at: string | null
  expires_at: string | null
  cost_amount: number | null
  cost_currency: string
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

export const postingsApi = {
  list: (token: string, jobId?: number) =>
    req<JobPosting[]>(`/postings${jobId ? `?job_id=${jobId}` : ''}`, token),

  get: (token: string, id: number) =>
    req<JobPosting>(`/postings/${id}`, token),

  create: (token: string, data: { job_id: number; board_id: number; [k: string]: unknown }) =>
    req<JobPosting>('/postings', token, { method: 'POST', body: JSON.stringify(data) }),

  update: (token: string, id: number, data: Partial<JobPosting>) =>
    req<JobPosting>(`/postings/${id}`, token, { method: 'PUT', body: JSON.stringify(data) }),

  delete: (token: string, id: number) =>
    req<{ deleted: boolean }>(`/postings/${id}`, token, { method: 'DELETE' }),
}
