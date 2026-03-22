import type { AccountLabelRow } from './labels'

const BASE = '/api/v1'

/** Job-wide attributes interviewers must score (1–scale_max). Drives scorecard validation. */
export interface ScorecardCriterion {
  name: string
  scale_max?: number
  required?: boolean
}

/** Flexible JSON for wizard sections not stored as top-level columns. */
export type JobConfig = Record<string, unknown> & {
  skills_required?: string[]
  skills_nice?: string[]
  interview_defaults?: {
    default_duration_minutes?: number
    default_format?: string
    calendar_integration_note?: string
  }
  evaluation?: {
    feedback_template?: string
    rating_scale_note?: string
    mandatory_fields_before_submit?: boolean
  }
  posting?: {
    visibility?: string
    job_board_ids?: number[]
    application_fields?: Record<string, boolean>
  }
  automation?: {
    resume_screening_rules?: string
    ai_scoring_enabled?: boolean
    interview_invite_template?: string
    rejection_template?: string
    followup_template?: string
    sla_review_hours?: number
  }
  permissions?: {
    view_user_ids?: number[]
    edit_user_ids?: number[]
    move_user_ids?: number[]
    feedback_user_ids?: number[]
  }
  compliance?: {
    eeo_note?: string
    approval_workflow?: string
  }
}

export interface JobAttachment {
  id: number
  account_id: number
  job_id: number
  name: string
  doc_type: string | null
  file_url: string
  created_at: string
  updated_at: string
}

export interface JobAnalytics {
  total_applicants: number
  by_status: Record<string, number>
  by_source: Record<string, number>
  hired_count: number
  offer_stage_count: number
  rejected_or_withdrawn: number
  offer_acceptance_rate: number | null
}

export interface Job {
  id: number
  account_id: number
  title: string
  slug: string
  /** Public apply URL: `/apply/{apply_token}` — submissions use source_type `public_apply`. */
  apply_token?: string
  department: string | null
  location: string | null
  location_type: string
  employment_type: string
  experience_level: string | null
  open_positions?: number
  bonus_incentives?: string | null
  budget_approval_status?: string | null
  cost_center?: string | null
  hiring_budget_id?: string | null
  hiring_manager_user_id?: number | null
  recruiter_user_id?: number | null
  requisition_id?: string | null
  job_config?: JobConfig
  salary_min: number | null
  salary_max: number | null
  salary_currency: string
  salary_visible: boolean
  status: string
  published_at: string | null
  closes_at: string | null
  tags: string[]
  /** Workspace-defined custom attributes (see Settings → Custom fields → Jobs). */
  custom_fields?: Record<string, unknown>
  scorecard_criteria?: ScorecardCriterion[] | string[]
  created_at: string
  updated_at: string
  versions?: JobVersion[]
  attachments?: JobAttachment[]
  /** Workspace labels (Settings → Labels); persisted via PATCH /jobs/:id/labels. */
  labels?: AccountLabelRow[]
}

export interface JobVersion {
  id: number
  job_id: number
  version_name: string
  version_number: number
  description: string
  requirements: string | null
  benefits: string | null
  is_active: boolean
  is_control: boolean
  traffic_weight: number
  created_at: string
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

export type JobListParams = {
  status?: string
  q?: string
  department?: string
  location?: string
}

export const jobsApi = {
  list: (token: string, params?: JobListParams) => {
    const p = new URLSearchParams()
    if (params?.status) p.set('status', params.status)
    if (params?.q?.trim()) p.set('q', params.q.trim())
    if (params?.department?.trim()) p.set('department', params.department.trim())
    if (params?.location?.trim()) p.set('location', params.location.trim())
    const qs = p.toString()
    return req<Job[]>(`/jobs${qs ? `?${qs}` : ''}`, token)
  },

  get: (token: string, id: number) =>
    req<Job>(`/jobs/${id}`, token),

  create: (token: string, data: Partial<Job> & { description?: string }) =>
    req<Job>('/jobs', token, { method: 'POST', body: JSON.stringify(data) }),

  update: (token: string, id: number, data: Partial<Job> & { job_config?: JobConfig }) =>
    req<Job>(`/jobs/${id}`, token, { method: 'PUT', body: JSON.stringify(data) }),

  analytics: (token: string, jobId: number) =>
    req<JobAnalytics>(`/jobs/${jobId}/analytics`, token),

  listAttachments: (token: string, jobId: number) =>
    req<JobAttachment[]>(`/jobs/${jobId}/attachments`, token),

  createAttachment: (token: string, jobId: number, data: { name: string; file_url: string; doc_type?: string }) =>
    req<JobAttachment>(`/jobs/${jobId}/attachments`, token, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  deleteAttachment: (token: string, jobId: number, attachmentId: number) =>
    req<{ deleted: boolean }>(`/jobs/${jobId}/attachments/${attachmentId}`, token, { method: 'DELETE' }),

  delete: (token: string, id: number) =>
    req<{ deleted: boolean }>(`/jobs/${id}`, token, { method: 'DELETE' }),

  listVersions: (token: string, jobId: number) =>
    req<JobVersion[]>(`/jobs/${jobId}/versions`, token),

  createVersion: (token: string, jobId: number, data: Partial<JobVersion> & { description: string }) =>
    req<JobVersion>(`/jobs/${jobId}/versions`, token, { method: 'POST', body: JSON.stringify(data) }),

  updateVersion: (
    token: string,
    jobId: number,
    versionId: number,
    data: Partial<{
      description: string
      requirements: string | null
      benefits: string | null
      title_override: string | null
      call_to_action: string
      traffic_weight: number
      is_active: boolean
      is_control: boolean
    }>,
  ) =>
    req<JobVersion>(`/jobs/${jobId}/versions/${versionId}`, token, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
}
