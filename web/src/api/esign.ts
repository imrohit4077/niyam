import type { TemplateDocument } from '../esign/templateDocument'

const BASE = '/api/v1'

export interface EsignTemplate {
  id: number
  account_id: number
  name: string
  description: string | null
  content_html: string
  content_blocks?: TemplateDocument | null
  created_at: string
  updated_at: string
}

export interface EsignStageRule {
  id: number
  account_id: number
  job_id: number | null
  pipeline_stage_id: number | null
  trigger_stage_type: string | null
  action_type: string
  template_id: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface EsignRequestRow {
  id: number
  account_id: number
  application_id: number
  template_id: number | null
  template_name?: string | null
  rule_id: number | null
  provider: string
  external_envelope_id: string | null
  status: string
  rendered_html: string | null
  candidate_sign_token: string
  signing_url: string | null
  signed_document_url: string | null
  signer_legal_name: string | null
  provider_metadata: Record<string, unknown>
  events: unknown[]
  created_at: string
  updated_at: string
  sent_at: string | null
  viewed_at: string | null
  signed_at: string | null
  declined_at: string | null
  candidate_name?: string | null
  candidate_email?: string | null
  job_title?: string | null
  job_id?: number | null
}

export interface EsignAccountSettings {
  provider: string
  webhook_secret: string
  frontend_base_url: string
  field_map: Record<string, string>
}

function authHeaders(token: string) {
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
}

/** Avoid `res.json()` on HTML/plain "Internal Server Error" — parse safely and surface useful errors. */
async function readApiJson(res: Response): Promise<{ success?: boolean; data?: unknown; error?: string; code?: number }> {
  const text = await res.text()
  const trimmed = text.trim()
  if (!trimmed) {
    return { success: false, error: `Empty response (${res.status})` }
  }
  if (trimmed.startsWith('<') || (!trimmed.startsWith('{') && !trimmed.startsWith('['))) {
    const snippet = trimmed.slice(0, 120).replace(/\s+/g, ' ')
    return {
      success: false,
      error:
        res.status >= 500
          ? `Server error (${res.status}). ${snippet || 'Non-JSON response'}. Try: python manage.py db migrate`
          : snippet || `Non-JSON response (${res.status})`,
    }
  }
  try {
    return JSON.parse(trimmed) as { success?: boolean; data?: unknown; error?: string }
  } catch {
    return { success: false, error: `Invalid JSON from server (${res.status})` }
  }
}

async function req<T>(path: string, token: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { ...authHeaders(token), ...(options.headers as Record<string, string> ?? {}) },
    ...options,
  })
  const json = await readApiJson(res)
  if (!json.success) throw new Error(json.error || 'Request failed')
  return json.data as T
}

export const esignApi = {
  listTemplates: (token: string) => req<EsignTemplate[]>('/esign_templates', token),
  getTemplate: (token: string, id: number) => req<EsignTemplate>(`/esign_templates/${id}`, token),
  createTemplate: (
    token: string,
    data:
      | { name: string; description?: string; content_blocks: TemplateDocument }
      | { name: string; description?: string; content_html: string },
  ) => req<EsignTemplate>('/esign_templates', token, { method: 'POST', body: JSON.stringify(data) }),
  updateTemplate: (
    token: string,
    id: number,
    data: Partial<{
      name: string
      description: string | null
      content_html: string
      content_blocks: TemplateDocument | null
    }>,
  ) => req<EsignTemplate>(`/esign_templates/${id}`, token, { method: 'PUT', body: JSON.stringify(data) }),
  deleteTemplate: (token: string, id: number) =>
    req<{ deleted: boolean }>(`/esign_templates/${id}`, token, { method: 'DELETE' }),

  listRules: (token: string, jobId?: number) =>
    req<EsignStageRule[]>(
      `/esign_stage_rules${jobId != null ? `?job_id=${jobId}` : ''}`,
      token,
    ),
  createRule: (
    token: string,
    data: {
      template_id: number
      job_id?: number | null
      pipeline_stage_id?: number | null
      trigger_stage_type?: string | null
      is_active?: boolean
    },
  ) => req<EsignStageRule>('/esign_stage_rules', token, { method: 'POST', body: JSON.stringify(data) }),
  updateRule: (token: string, id: number, data: Partial<{ is_active: boolean; template_id: number }>) =>
    req<EsignStageRule>(`/esign_stage_rules/${id}`, token, { method: 'PUT', body: JSON.stringify(data) }),
  deleteRule: (token: string, id: number) =>
    req<{ deleted: boolean }>(`/esign_stage_rules/${id}`, token, { method: 'DELETE' }),

  getSettings: (token: string) => req<EsignAccountSettings>('/account/esign_settings', token),
  patchSettings: (token: string, data: Partial<EsignAccountSettings>) =>
    req<EsignAccountSettings>('/account/esign_settings', token, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  listRequestsForApplication: (token: string, applicationId: number) =>
    req<EsignRequestRow[]>(`/applications/${applicationId}/esign_requests`, token),

  listAllRequests: (
    token: string,
    params?: { q?: string; status?: string; limit?: number },
  ) => {
    const p = new URLSearchParams()
    if (params?.q?.trim()) p.set('q', params.q.trim())
    if (params?.status && params.status !== 'all') p.set('status', params.status)
    if (params?.limit != null) p.set('limit', String(params.limit))
    const qs = p.toString()
    return req<EsignRequestRow[]>(`/esign_requests${qs ? `?${qs}` : ''}`, token)
  },

  generateForApplication: (token: string, applicationId: number, body?: { template_id?: number | null }) =>
    req<EsignRequestRow[]>(`/applications/${applicationId}/esign_requests/generate`, token, {
      method: 'POST',
      body: JSON.stringify(body ?? {}),
    }),
}

export interface PublicSignPage {
  status: string
  template_name: string | null
  candidate_display_name: string
  html: string
  already_signed: boolean
  signed_at: string | null
  signer_legal_name?: string | null
  signed_copy_available?: boolean
}

export async function publicGetSignPage(token: string): Promise<PublicSignPage> {
  const res = await fetch(`${BASE}/public/esign/sign/${encodeURIComponent(token)}`)
  const json = await readApiJson(res)
  if (!json.success) throw new Error(json.error || 'Request failed')
  return json.data as PublicSignPage
}

export async function publicSubmitSign(
  token: string,
  legalName: string,
  confirm: boolean,
  signatureImagePngDataUrl: string,
): Promise<{ status: string; signed_at?: string; signed_copy_available?: boolean }> {
  const res = await fetch(`${BASE}/public/esign/sign/${encodeURIComponent(token)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      legal_name: legalName,
      confirm,
      signature_image: signatureImagePngDataUrl,
    }),
  })
  const json = await readApiJson(res)
  if (!json.success) throw new Error(json.error || 'Request failed')
  return json.data as { status: string; signed_at?: string }
}
