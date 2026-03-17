const BASE = '/api/v1'

export interface Job {
  id: number
  account_id: number
  title: string
  slug: string
  department: string | null
  location: string | null
  location_type: string
  employment_type: string
  experience_level: string | null
  salary_min: number | null
  salary_max: number | null
  salary_currency: string
  salary_visible: boolean
  status: string
  published_at: string | null
  closes_at: string | null
  tags: string[]
  created_at: string
  updated_at: string
  versions?: JobVersion[]
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

export const jobsApi = {
  list: (token: string, status?: string) =>
    req<Job[]>(`/jobs${status ? `?status=${status}` : ''}`, token),

  get: (token: string, id: number) =>
    req<Job>(`/jobs/${id}`, token),

  create: (token: string, data: Partial<Job> & { description?: string }) =>
    req<Job>('/jobs', token, { method: 'POST', body: JSON.stringify(data) }),

  update: (token: string, id: number, data: Partial<Job>) =>
    req<Job>(`/jobs/${id}`, token, { method: 'PUT', body: JSON.stringify(data) }),

  delete: (token: string, id: number) =>
    req<{ deleted: boolean }>(`/jobs/${id}`, token, { method: 'DELETE' }),

  listVersions: (token: string, jobId: number) =>
    req<JobVersion[]>(`/jobs/${jobId}/versions`, token),

  createVersion: (token: string, jobId: number, data: Partial<JobVersion> & { description: string }) =>
    req<JobVersion>(`/jobs/${jobId}/versions`, token, { method: 'POST', body: JSON.stringify(data) }),
}
