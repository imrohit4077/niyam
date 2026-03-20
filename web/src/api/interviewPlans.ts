const BASE = '/api/v1'

export interface InterviewKit {
  id?: number
  account_id?: number
  interview_plan_id?: number
  focus_area: string | null
  instructions: string | null
  questions: unknown[]
  created_at?: string
  updated_at?: string
}

export interface InterviewPlan {
  id: number
  account_id: number
  job_id: number
  name: string
  pipeline_stage_id: number | null
  position: number
  duration_minutes?: number | null
  interview_format?: string | null
  created_at: string
  updated_at: string
  kit?: InterviewKit | null
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

export const interviewPlansApi = {
  list: (token: string, jobId: number) =>
    req<InterviewPlan[]>(`/jobs/${jobId}/interview_plans`, token),

  create: (
    token: string,
    jobId: number,
    data: {
      name: string
      pipeline_stage_id?: number | null
      position?: number
      duration_minutes?: number | null
      interview_format?: string | null
      kit?: { focus_area?: string | null; instructions?: string | null; questions?: unknown[] }
    },
  ) =>
    req<InterviewPlan>(`/jobs/${jobId}/interview_plans`, token, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (
    token: string,
    jobId: number,
    planId: number,
    data: Partial<{
      name: string
      pipeline_stage_id: number | null
      position: number
      duration_minutes: number | null
      interview_format: string | null
    }>,
  ) =>
    req<InterviewPlan>(`/jobs/${jobId}/interview_plans/${planId}`, token, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  delete: (token: string, jobId: number, planId: number) =>
    req<{ deleted: boolean }>(`/jobs/${jobId}/interview_plans/${planId}`, token, {
      method: 'DELETE',
    }),

  getKit: (token: string, jobId: number, planId: number) =>
    req<InterviewKit>(`/jobs/${jobId}/interview_plans/${planId}/kit`, token),

  putKit: (
    token: string,
    jobId: number,
    planId: number,
    data: { focus_area?: string | null; instructions?: string | null; questions?: unknown[] },
  ) =>
    req<InterviewKit>(`/jobs/${jobId}/interview_plans/${planId}/kit`, token, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
}
