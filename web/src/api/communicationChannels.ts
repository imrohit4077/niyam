const BASE = '/api/v1'

export type CommunicationChannelRow = {
  id: number
  account_id: number
  name: string
  channel_type: string
  provider: string
  display_email: string | null
  display_name: string | null
  config: Record<string, unknown>
  credentials: {
    has_password: boolean
    has_oauth: boolean
    username_hint: string | null
  }
  status: string
  error_message: string | null
  is_default: boolean
  verified_at: string | null
  last_used_at: string | null
  created_by: number | null
  created_at: string
  updated_at: string
  deleted_at: string | null
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

export type CreateChannelBody = {
  name: string
  channel_type?: 'email'
  provider: 'gmail' | 'outlook' | 'smtp'
  display_email?: string | null
  display_name?: string | null
  config?: Record<string, unknown>
  credentials?: Record<string, unknown>
  is_default?: boolean | null
}

export type UpdateChannelBody = {
  name?: string
  display_email?: string | null
  display_name?: string | null
  config?: Record<string, unknown>
  credentials?: Record<string, unknown>
  is_default?: boolean | null
}

export const communicationChannelsApi = {
  list: (token: string, channelType?: string) =>
    req<CommunicationChannelRow[]>(
      `/communication_channels${channelType ? `?channel_type=${encodeURIComponent(channelType)}` : ''}`,
      token,
    ),

  show: (token: string, id: number) => req<CommunicationChannelRow>(`/communication_channels/${id}`, token),

  create: (token: string, body: CreateChannelBody) =>
    req<CommunicationChannelRow>('/communication_channels', token, {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  update: (token: string, id: number, body: UpdateChannelBody) =>
    req<CommunicationChannelRow>(`/communication_channels/${id}`, token, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),

  destroy: (token: string, id: number) =>
    req<{ deleted: boolean }>(`/communication_channels/${id}`, token, { method: 'DELETE' }),

  test: (token: string, id: number) =>
    req<CommunicationChannelRow>(`/communication_channels/${id}/test`, token, { method: 'POST' }),

  setDefault: (token: string, id: number) =>
    req<CommunicationChannelRow>(`/communication_channels/${id}/set_default`, token, { method: 'PATCH' }),
}
