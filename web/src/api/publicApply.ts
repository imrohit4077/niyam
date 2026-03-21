import type { CustomAttributeDefinition } from './customAttributes'

const BASE = '/api/v1'

export interface PublicJobApplyPayload {
  title: string
  company_name: string
  department: string | null
  location: string | null
  location_type: string
  employment_type: string
  experience_level: string | null
  open_positions: number
  description_html: string
  skills_required: string[]
  skills_nice: string[]
  bonus_incentives: string | null
  salary: { min: number | null; max: number | null; currency: string } | null
  application_fields: {
    resume: boolean
    cover_letter: boolean
    portfolio: boolean
    linkedin: boolean
  }
  custom_attribute_definitions?: CustomAttributeDefinition[]
}

async function publicReq<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(options.headers as Record<string, string> ?? {}) },
    ...options,
  })
  const json = await res.json()
  if (!json.success) throw new Error(json.error || 'Request failed')
  return json.data as T
}

export const publicApplyApi = {
  getJob: (token: string) =>
    publicReq<PublicJobApplyPayload>(`/public/apply/${encodeURIComponent(token)}`, { method: 'GET' }),

  submit: (token: string, body: Record<string, unknown>) =>
    publicReq<{ submitted: boolean }>(`/public/apply/${encodeURIComponent(token)}`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
}
