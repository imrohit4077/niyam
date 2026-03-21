const BASE = '/api/v1'

export interface AccountMember {
  id: number
  name: string
  email: string
}

function authHeaders(token: string) {
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
}

async function req<T>(path: string, token: string, search?: string): Promise<T> {
  const qs = search?.trim() ? `?q=${encodeURIComponent(search.trim())}` : ''
  const res = await fetch(`${BASE}${path}${qs}`, { headers: authHeaders(token) })
  const json = await res.json()
  if (!json.success) throw new Error(json.error || 'Request failed')
  return json.data as T
}

export const accountMembersApi = {
  list: (token: string, q?: string) => req<AccountMember[]>('/account/members', token, q),
}
