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
  const res = await fetch(`${BASE}${path}${search ?? ''}`, { headers: authHeaders(token) })
  const json = await res.json()
  if (!json.success) throw new Error(json.error || 'Request failed')
  return json.data as T
}

function membersQuery(opts?: { q?: string; workspace_role?: string }): string {
  const p = new URLSearchParams()
  if (opts?.q?.trim()) p.set('q', opts.q.trim())
  if (opts?.workspace_role?.trim()) p.set('workspace_role', opts.workspace_role.trim())
  const s = p.toString()
  return s ? `?${s}` : ''
}

export const accountMembersApi = {
  list: (token: string, opts?: { q?: string; workspace_role?: string }) =>
    req<AccountMember[]>('/account/members', token, membersQuery(opts)),
}
