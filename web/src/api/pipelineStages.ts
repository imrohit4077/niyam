const BASE = '/api/v1'

export interface PipelineStage {
  id: number
  account_id: number
  job_id: number
  name: string
  position: number
  stage_type: string | null
  automation_rules: Record<string, unknown>
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

export const pipelineStagesApi = {
  listByJob: (token: string, jobId: number) =>
    req<PipelineStage[]>(`/jobs/${jobId}/pipeline_stages`, token),

  create: (
    token: string,
    jobId: number,
    data: { name: string; position?: number; stage_type?: string | null; automation_rules?: Record<string, unknown> },
  ) =>
    req<PipelineStage>(`/jobs/${jobId}/pipeline_stages`, token, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (
    token: string,
    id: number,
    data: Partial<{
      name: string
      position: number
      stage_type: string | null
      automation_rules: Record<string, unknown>
    }>,
  ) => req<PipelineStage>(`/pipeline_stages/${id}`, token, { method: 'PUT', body: JSON.stringify(data) }),

  delete: (token: string, id: number) =>
    req<{ deleted: boolean }>(`/pipeline_stages/${id}`, token, { method: 'DELETE' }),

  reorder: (token: string, jobId: number, orderedIds: number[]) =>
    req<PipelineStage[]>(`/jobs/${jobId}/pipeline_stages/reorder`, token, {
      method: 'PATCH',
      body: JSON.stringify({ ordered_ids: orderedIds }),
    }),
}
