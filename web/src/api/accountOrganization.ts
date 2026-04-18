const BASE = '/api/v1'

export interface OrganizationDepartment {
  id: string
  name: string
}

export interface JobSetupCatalogField {
  id: string
  db_id: number
  label: string
  is_enabled?: boolean
  built_in?: boolean
  position?: number
}

export interface JobSetupCatalogSection {
  id: string
  db_id: number
  label: string
  is_enabled?: boolean
  built_in?: boolean
  position?: number
  fields: JobSetupCatalogField[]
}

export interface OrganizationSettings {
  name: string
  slug: string
  plan: string | null
  logo_url: string
  careers_page_url: string
  default_language: string
  default_currency: string
  timezone: string
  /** Job departments for filters & job forms (managed here). */
  departments: OrganizationDepartment[]
  /** ISO 3166-1 alpha-2 codes enabled for job location; null = all countries from catalog. */
  enabled_country_codes: string[] | null
  /** Enabled setup sections for the job editor wizard. */
  enabled_job_setup_sections: string[]
  /** Enabled field blocks by section for the job editor wizard. */
  enabled_job_setup_fields: Record<string, string[]>
  /** Account-scoped job editor wizard catalog (sections + field blocks). */
  job_setup_catalog: JobSetupCatalogSection[]
}

async function readApiJson(res: Response): Promise<{ success?: boolean; data?: unknown; error?: string }> {
  const json = (await res.json()) as { success?: boolean; data?: unknown; error?: string }
  return json
}

async function req<T>(path: string, token: string, accountId: number, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: options.method ?? 'GET',
    body: options.body,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      'X-Account-Id': String(accountId),
      ...(options.headers as Record<string, string> | undefined),
    },
  })
  const json = await readApiJson(res)
  if (!json.success) throw new Error(json.error || 'Request failed')
  return json.data as T
}

/** Loads and updates `accounts.settings.organization` for the given workspace (X-Account-Id). */
export function getOrganizationSettings(token: string, accountId: number) {
  return req<OrganizationSettings>('/account/organization_settings', token, accountId)
}

export interface OrganizationSettingsUpdate {
  name?: string
  organization?: Partial<
    Pick<
      OrganizationSettings,
      | 'logo_url'
      | 'careers_page_url'
      | 'default_language'
      | 'default_currency'
      | 'timezone'
      | 'departments'
      | 'enabled_country_codes'
      | 'enabled_job_setup_sections'
      | 'enabled_job_setup_fields'
    >
  >
}

export function patchOrganizationSettings(token: string, accountId: number, body: OrganizationSettingsUpdate) {
  return req<OrganizationSettings>('/account/organization_settings', token, accountId, {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
}
