const BASE = '/api/v1'

async function readApiJson(res: Response): Promise<{ success?: boolean; data?: unknown; error?: string }> {
  return (await res.json()) as { success?: boolean; data?: unknown; error?: string }
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

export interface JobSetupFlowFieldRow {
  id: string
  db_id: number
  label: string
  is_enabled: boolean
  built_in: boolean
  position: number
}

export interface JobSetupFlowSectionRow {
  id: string
  db_id: number
  label: string
  is_enabled: boolean
  built_in: boolean
  position: number
  fields: JobSetupFlowFieldRow[]
}

export interface JobSetupFlowIndexResponse {
  sections: JobSetupFlowSectionRow[]
}

export function listJobSetupFlow(token: string, accountId: number) {
  return req<JobSetupFlowIndexResponse>('/account/job_setup_flow', token, accountId)
}

export function createJobSetupSection(token: string, accountId: number, body: { label: string; section_key?: string }) {
  return req<JobSetupFlowSectionRow>('/account/job_setup_flow/sections', token, accountId, {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export function updateJobSetupSection(
  token: string,
  accountId: number,
  sectionDbId: number,
  body: Partial<{ label: string; is_enabled: boolean; position: number }>,
) {
  return req<JobSetupFlowSectionRow>(`/account/job_setup_flow/sections/${sectionDbId}`, token, accountId, {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
}

export function destroyJobSetupSection(token: string, accountId: number, sectionDbId: number) {
  return req<{ deleted: boolean }>(`/account/job_setup_flow/sections/${sectionDbId}`, token, accountId, {
    method: 'DELETE',
  })
}

export function createJobSetupField(
  token: string,
  accountId: number,
  sectionDbId: number,
  body: { label: string; field_key?: string },
) {
  return req<JobSetupFlowFieldRow>(`/account/job_setup_flow/sections/${sectionDbId}/fields`, token, accountId, {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export function updateJobSetupField(
  token: string,
  accountId: number,
  fieldDbId: number,
  body: Partial<{ label: string; is_enabled: boolean; position: number }>,
) {
  return req<JobSetupFlowFieldRow>(`/account/job_setup_flow/fields/${fieldDbId}`, token, accountId, {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
}

export function destroyJobSetupField(token: string, accountId: number, fieldDbId: number) {
  return req<{ deleted: boolean }>(`/account/job_setup_flow/fields/${fieldDbId}`, token, accountId, {
    method: 'DELETE',
  })
}
