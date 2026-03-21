const BASE = '/api/v1'

export interface OrganizationSettings {
  name: string
  slug: string
  plan: string | null
  logo_url: string
  careers_page_url: string
  default_language: string
  default_currency: string
  timezone: string
}

async function readApiJson(res: Response): Promise<{ success?: boolean; data?: unknown; error?: string }> {
  const json = (await res.json()) as { success?: boolean; data?: unknown; error?: string }
  return json
}

async function req<T>(path: string, token: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...options.headers },
    ...options,
  })
  const json = await readApiJson(res)
  if (!json.success) throw new Error(json.error || 'Request failed')
  return json.data as T
}

export function getOrganizationSettings(token: string) {
  return req<OrganizationSettings>('/account/organization_settings', token)
}

export interface OrganizationSettingsUpdate {
  name?: string
  organization?: Partial<
    Pick<OrganizationSettings, 'logo_url' | 'careers_page_url' | 'default_language' | 'default_currency' | 'timezone'>
  >
}

export function patchOrganizationSettings(token: string, body: OrganizationSettingsUpdate) {
  return req<OrganizationSettings>('/account/organization_settings', token, {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
}
