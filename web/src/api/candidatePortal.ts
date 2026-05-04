const BASE = '/api/v1'

export interface CandidatePortalProfile {
  id: number
  account_id: number
  email: string
  full_name: string | null
  phone: string | null
  location: string | null
  headline: string | null
  summary: string | null
  linkedin_url: string | null
  portfolio_url: string | null
  profile_picture_url: string | null
  resume_url: string | null
  status: string
  last_login_at: string | null
  created_at: string
  updated_at: string
}

export interface CandidatePortalApplication {
  id: number
  job_id: number
  status: string
  stage_history: Array<{ stage: string; changed_at?: string; changed_by?: number }>
  created_at: string
  updated_at: string
  job: { id: number; title: string; slug: string; status: string }
}

type PortalAuthResponse = {
  access_token: string
  token_type: string
  profile: CandidatePortalProfile
}

async function jsonReq<T>(path: string, options: RequestInit = {}, token?: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers as Record<string, string> ?? {}),
    },
    ...options,
  })
  const json = await res.json()
  if (!json.success) throw new Error(json.error || 'Request failed')
  return json.data as T
}

async function uploadReq(path: string, file: File, token: string): Promise<{ file_url: string; profile: CandidatePortalProfile }> {
  const form = new FormData()
  form.append('file', file)
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  })
  const json = await res.json()
  if (!json.success) throw new Error(json.error || 'Request failed')
  return json.data as { file_url: string; profile: CandidatePortalProfile }
}

export type CandidatePortalAuthPayload = {
  email: string
  password: string
  full_name?: string
}

export const candidatePortalApi = {
  register: (payload: CandidatePortalAuthPayload) =>
    jsonReq<PortalAuthResponse>('/public/candidate-portal/register', { method: 'POST', body: JSON.stringify(payload) }),

  login: (payload: Pick<CandidatePortalAuthPayload, 'email' | 'password'>) =>
    jsonReq<PortalAuthResponse>('/public/candidate-portal/login', { method: 'POST', body: JSON.stringify(payload) }),

  me: (token: string) =>
    jsonReq<CandidatePortalProfile>('/candidate_portal/me', { method: 'GET' }, token),

  updateMe: (token: string, patch: Partial<CandidatePortalProfile>) =>
    jsonReq<CandidatePortalProfile>('/candidate_portal/me', { method: 'PATCH', body: JSON.stringify(patch) }, token),

  myApplications: (token: string) =>
    jsonReq<CandidatePortalApplication[]>('/candidate_portal/me/applications', { method: 'GET' }, token),

  uploadPhoto: (token: string, file: File) => uploadReq('/candidate_portal/me/upload_photo', file, token),
  uploadResume: (token: string, file: File) => uploadReq('/candidate_portal/me/upload_resume', file, token),
}
