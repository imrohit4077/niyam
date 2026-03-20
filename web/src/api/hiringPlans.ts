const BASE = '/api/v1'

export interface HiringPlanHealth {
  label: string
  on_track: boolean | null
  at_risk: boolean
  days_left?: number
  remaining_hires?: number
  progress_ratio?: number
}

export interface HiringPlan {
  id: number
  account_id: number
  job_id: number
  target_hires: number
  hires_made: number
  deadline: string | null
  hiring_manager_id: number | null
  primary_recruiter_id: number | null
  plan_status: string
  created_at: string
  updated_at: string
  health?: HiringPlanHealth
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

export const hiringPlansApi = {
  list: (token: string, jobId?: number) => {
    const q = jobId != null ? `?job_id=${jobId}` : ''
    return req<HiringPlan[]>(`/hiring_plans${q}`, token)
  },

  get: (token: string, id: number) => req<HiringPlan>(`/hiring_plans/${id}`, token),

  getForJob: (token: string, jobId: number) => req<HiringPlan>(`/jobs/${jobId}/hiring_plan`, token),

  create: (
    token: string,
    data: {
      job_id: number
      target_hires?: number
      deadline?: string | null
      hiring_manager_id?: number | null
      primary_recruiter_id?: number | null
      plan_status?: string
    },
  ) => req<HiringPlan>('/hiring_plans', token, { method: 'POST', body: JSON.stringify(data) }),

  update: (
    token: string,
    id: number,
    data: Partial<{
      target_hires: number
      hires_made: number
      deadline: string | null
      hiring_manager_id: number | null
      primary_recruiter_id: number | null
      plan_status: string
    }>,
  ) => req<HiringPlan>(`/hiring_plans/${id}`, token, { method: 'PUT', body: JSON.stringify(data) }),

  delete: (token: string, id: number) =>
    req<{ deleted: boolean }>(`/hiring_plans/${id}`, token, { method: 'DELETE' }),
}
