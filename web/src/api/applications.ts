const BASE = '/api/v1'

export interface Application {
  id: number
  account_id: number
  job_id: number
  candidate_name: string | null
  candidate_email: string
  candidate_phone: string | null
  candidate_location: string | null
  resume_url: string | null
  cover_letter: string | null
  linkedin_url: string | null
  source_type: string
  status: string
  pipeline_stage_id?: number | null
  stage_history: { stage: string; changed_at: string; changed_by?: number; pipeline_stage_id?: number | null }[]
  tags: string[]
  score: number | null
  rejection_reason: string | null
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

export const applicationsApi = {
  list: (token: string, jobId?: number, status?: string) => {
    const params = new URLSearchParams()
    if (jobId) params.set('job_id', String(jobId))
    if (status) params.set('status', status)
    const qs = params.toString()
    return req<Application[]>(`/applications${qs ? `?${qs}` : ''}`, token)
  },

  get: (token: string, id: number) =>
    req<Application>(`/applications/${id}`, token),

  create: (token: string, data: { job_id: number; candidate_email: string; [k: string]: unknown }) =>
    req<Application>('/applications', token, { method: 'POST', body: JSON.stringify(data) }),

  updateStage: (
    token: string,
    id: number,
    body: { status?: string; pipeline_stage_id?: number | null; reason?: string },
  ) =>
    req<Application>(`/applications/${id}/stage`, token, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),

  delete: (token: string, id: number) =>
    req<{ deleted: boolean }>(`/applications/${id}`, token, { method: 'DELETE' }),
}
