const BASE = '/api/v1'

export interface HiringAttributeRow {
  id: number
  account_id: number
  name: string
  category: string | null
  description: string | null
  position: number
  created_at?: string
  updated_at?: string
}

export interface HiringStageTemplateRow {
  id: number
  account_id: number
  name: string
  default_interviewer_user_ids: number[]
  position: number
  default_attribute_ids?: number[]
  default_attributes?: HiringAttributeRow[]
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

export const hiringAttributesApi = {
  list: (token: string) => req<HiringAttributeRow[]>('/hiring_attributes', token),
  create: (token: string, body: Record<string, unknown>) =>
    req<HiringAttributeRow>('/hiring_attributes', token, { method: 'POST', body: JSON.stringify(body) }),
  update: (token: string, id: number, body: Record<string, unknown>) =>
    req<HiringAttributeRow>(`/hiring_attributes/${id}`, token, { method: 'PUT', body: JSON.stringify(body) }),
  destroy: (token: string, id: number) =>
    req<{ deleted: boolean }>(`/hiring_attributes/${id}`, token, { method: 'DELETE' }),
}

export const hiringStageTemplatesApi = {
  list: (token: string) => req<HiringStageTemplateRow[]>('/hiring_stage_templates', token),
  get: (token: string, id: number) => req<HiringStageTemplateRow>(`/hiring_stage_templates/${id}`, token),
  create: (token: string, body: Record<string, unknown>) =>
    req<HiringStageTemplateRow>('/hiring_stage_templates', token, { method: 'POST', body: JSON.stringify(body) }),
  update: (token: string, id: number, body: Record<string, unknown>) =>
    req<HiringStageTemplateRow>(`/hiring_stage_templates/${id}`, token, { method: 'PUT', body: JSON.stringify(body) }),
  destroy: (token: string, id: number) =>
    req<{ deleted: boolean }>(`/hiring_stage_templates/${id}`, token, { method: 'DELETE' }),
}
