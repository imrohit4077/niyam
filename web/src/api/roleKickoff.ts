const BASE = '/api/v1'

export type RoleKickoffStatus =
  | 'submitted'
  | 'approved'
  | 'rejected'
  | 'changes_requested'
  | 'converted'

export interface RoleKickoffSelectedStage {
  stage_template_id: number
  attribute_ids: number[]
}

export interface RoleKickoffRequestRow {
  id: number
  account_id: number
  created_by_user_id: number
  assigned_recruiter_user_id: number
  status: RoleKickoffStatus | string
  title: string
  department: string | null
  open_positions: number
  location: string | null
  why_hiring: string | null
  expectation_30_60_90: string | null
  success_definition: string | null
  skills_must_have: string[]
  skills_nice_to_have: string[]
  experience_note: string | null
  salary_min: number | null
  salary_max: number | null
  salary_currency: string
  budget_notes: string | null
  interview_rounds: number | null
  interviewers_note: string | null
  selected_stages?: RoleKickoffSelectedStage[]
  converted_job_id: number | null
  recruiter_feedback: string | null
  hiring_manager_name?: string | null
  hiring_manager_email?: string | null
  recruiter_name?: string | null
  recruiter_email?: string | null
  created_at?: string
  updated_at?: string
}

async function req<T>(path: string, token: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...init.headers },
    ...init,
  })
  const json = await res.json()
  if (!json.success) throw new Error(json.error || 'Request failed')
  return json.data as T
}

export const roleKickoffApi = {
  list: (token: string, scope: 'my' | 'queue' | 'all') =>
    req<RoleKickoffRequestRow[]>(`/role_kickoff_requests?scope=${encodeURIComponent(scope)}`, token),

  get: (token: string, id: number) => req<RoleKickoffRequestRow>(`/role_kickoff_requests/${id}`, token),

  create: (token: string, body: Record<string, unknown>) =>
    req<RoleKickoffRequestRow>('/role_kickoff_requests', token, { method: 'POST', body: JSON.stringify(body) }),

  update: (token: string, id: number, body: Record<string, unknown>) =>
    req<RoleKickoffRequestRow>(`/role_kickoff_requests/${id}`, token, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),

  approve: (token: string, id: number) =>
    req<RoleKickoffRequestRow>(`/role_kickoff_requests/${id}/approve`, token, { method: 'POST' }),

  reject: (token: string, id: number, feedback: string) =>
    req<RoleKickoffRequestRow>(`/role_kickoff_requests/${id}/reject`, token, {
      method: 'POST',
      body: JSON.stringify({ feedback }),
    }),

  requestChanges: (token: string, id: number, feedback: string) =>
    req<RoleKickoffRequestRow>(`/role_kickoff_requests/${id}/request_changes`, token, {
      method: 'POST',
      body: JSON.stringify({ feedback }),
    }),

  createJob: (token: string, id: number) =>
    req<{ id: number; title?: string; role_kickoff_request_id?: number }>(
      `/role_kickoff_requests/${id}/create_job`,
      token,
      { method: 'POST' },
    ),
}
