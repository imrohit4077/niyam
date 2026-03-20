const BASE = '/api/v1'

export interface ScorecardRow {
  id: number
  assignment_id: number
  application_id: number
  job_id: number
  interviewer_id: number
  overall_recommendation: string
  criteria_scores: Record<string, number | string>
  scores?: Record<string, number | string>
  notes: string | null
  pros: string | null
  cons: string | null
  internal_notes: string | null
  submitted_at: string | null
  interviewer?: { id: number; name?: string; email?: string }
  bias_flags?: string[]
  criteria_average?: number | null
}

export interface JobDebriefRow {
  application_id: number
  candidate_label: string
  scorecard_count: number
  recommendation_counts: Record<string, number>
  attribute_averages: Record<string, number>
  fit_score: number | null
  interviewers: {
    assignment_id: number
    interviewer_id: number
    overall_recommendation: string
    submitted_at: string | null
    criteria_average: number | null
  }[]
}

export interface JobDebriefPayload {
  job_id: number
  template_attributes: string[]
  applications: JobDebriefRow[]
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

export const scorecardsApi = {
  forApplication: (token: string, applicationId: number) =>
    req<ScorecardRow[]>(`/applications/${applicationId}/scorecards`, token),

  debriefForJob: (token: string, jobId: number) =>
    req<JobDebriefPayload>(`/jobs/${jobId}/scorecards/debrief`, token),
}
