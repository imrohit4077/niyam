const BASE = '/api/v1'

export type CustomAttributeEntityType = 'job' | 'application'

export interface CustomAttributeDefinition {
  id: number
  account_id: number
  entity_type: CustomAttributeEntityType
  attribute_key: string
  label: string
  field_type: 'text' | 'number' | 'decimal' | 'boolean' | 'date' | 'list'
  options: string[]
  required: boolean
  position: number
  created_at: string
  updated_at: string
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

export const customAttributesApi = {
  list: (token: string, entityType: CustomAttributeEntityType) =>
    req<CustomAttributeDefinition[]>(`/custom_attribute_definitions?entity_type=${encodeURIComponent(entityType)}`, token),

  create: (
    token: string,
    body: {
      entity_type: CustomAttributeEntityType
      attribute_key: string
      label: string
      field_type: CustomAttributeDefinition['field_type']
      options?: string[]
      required?: boolean
      position?: number
    },
  ) => req<CustomAttributeDefinition>('/custom_attribute_definitions', token, { method: 'POST', body: JSON.stringify(body) }),

  patch: (
    token: string,
    id: number,
    body: Partial<Pick<CustomAttributeDefinition, 'label' | 'field_type' | 'options' | 'required' | 'position'>>,
  ) => req<CustomAttributeDefinition>(`/custom_attribute_definitions/${id}`, token, { method: 'PATCH', body: JSON.stringify(body) }),

  delete: (token: string, id: number) => req<{ deleted: boolean }>(`/custom_attribute_definitions/${id}`, token, { method: 'DELETE' }),
}
