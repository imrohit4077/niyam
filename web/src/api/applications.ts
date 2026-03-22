import type { AccountLabelRow } from './labels'

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
  portfolio_url: string | null
  source_type: string
  status: string
  pipeline_stage_id?: number | null
  stage_history: { stage: string; changed_at: string; changed_by?: number; pipeline_stage_id?: number | null }[]
  tags: string[]
  /** Workspace-defined candidate/application attributes (Settings → Custom fields → Candidates). */
  custom_attributes?: Record<string, unknown>
  score: number | null
  rejection_reason: string | null
  rejection_note: string | null
  created_at: string
  updated_at: string
  labels?: AccountLabelRow[]
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

export type ApplicationListParams = {
  jobId?: number
  status?: string
  q?: string
  sourceType?: string
}

export const applicationsApi = {
  list: (token: string, params?: ApplicationListParams) => {
    const p = new URLSearchParams()
    if (params?.jobId != null) p.set('job_id', String(params.jobId))
    if (params?.status) p.set('status', params.status)
    if (params?.q?.trim()) p.set('q', params.q.trim())
    if (params?.sourceType?.trim()) p.set('source_type', params.sourceType.trim())
    const qs = p.toString()
    return req<Application[]>(`/applications${qs ? `?${qs}` : ''}`, token)
  },

  get: (token: string, id: number) =>
    req<Application>(`/applications/${id}`, token),

  create: (token: string, data: { job_id: number; candidate_email: string; [k: string]: unknown }) =>
    req<Application>('/applications', token, { method: 'POST', body: JSON.stringify(data) }),

  patch: (token: string, id: number, data: Record<string, unknown>) =>
    req<Application>(`/applications/${id}`, token, { method: 'PATCH', body: JSON.stringify(data) }),

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
