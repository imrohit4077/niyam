const BASE = '/api/v1'

export interface InterviewAssignmentRow {
  id: number
  account_id: number
  application_id: number
  interview_plan_id: number
  interviewer_id: number | null
  status: string
  scheduled_at: string | null
  interview_ends_at: string | null
  calendar_event_url: string | null
  scorecard_reminder_sent_at?: string | null
  created_at: string
  updated_at: string
  interview_plan?: { id: number; name: string; pipeline_stage_id: number | null; position: number } | null
  application?: {
    id: number
    candidate_id: number | null
    candidate_name: string | null
    candidate_email: string | null
    job_id: number
  } | null
}

export interface ScorecardCriterion {
  name: string
  scale_max: number
  required: boolean
}

export interface InterviewKitPayload {
  assignment: InterviewAssignmentRow
  interview_plan: { id: number; name: string; pipeline_stage_id: number | null; position: number }
  kit: {
    focus_area: string | null
    instructions: string | null
    questions: unknown[]
  } | null
  candidate: Record<string, unknown> | null
  job: Record<string, unknown> | null
  application: Record<string, unknown>
  scorecard_criteria?: ScorecardCriterion[]
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

export type MyAssignmentsParams = { status?: string; q?: string }

export const interviewsApi = {
  myAssignments: (token: string, params?: MyAssignmentsParams) => {
    const p = new URLSearchParams()
    if (params?.status) p.set('status', params.status)
    if (params?.q?.trim()) p.set('q', params.q.trim())
    const qs = p.toString()
    return req<InterviewAssignmentRow[]>(`/interviews/my_assignments${qs ? `?${qs}` : ''}`, token)
  },

  getKit: (token: string, assignmentId: number) =>
    req<InterviewKitPayload>(`/interviews/${assignmentId}/kit`, token),

  submitScorecard: (
    token: string,
    assignmentId: number,
    data: {
      overall_recommendation: string
      criteria_scores?: Record<string, number | string>
      scores?: Record<string, number | string>
      notes?: string | null
      pros?: string | null
      cons?: string | null
      internal_notes?: string | null
    },
  ) =>
    req<Record<string, unknown>>(`/interviews/${assignmentId}/scorecard`, token, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateAssignment: (
    token: string,
    assignmentId: number,
    data: Partial<{
      interviewer_id: number | null
      status: string
      scheduled_at: string | null
      interview_ends_at: string | null
      calendar_event_url: string | null
    }>,
  ) =>
    req<InterviewAssignmentRow>(`/interviews/${assignmentId}`, token, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
}
