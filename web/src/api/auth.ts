const BASE = '/api/v1'

export interface LoginResponse {
  access_token: string
  refresh_token: string
  token_type: string
  user: UserData
}

export interface UserData {
  id: number
  email: string
  name: string
  avatar: string | null
  status: string
  last_login_at: string | null
  created_at: string
  updated_at: string
  account: { id: number; name: string; slug: string; plan: string | null } | null
  role: { id: number; name: string; slug: string } | null
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  })
  const json = await res.json()
  if (!json.success) throw new Error(json.error || 'Request failed')
  return json.data as T
}

export function login(email: string, password: string) {
  return request<LoginResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
}

export function refreshToken(refresh_token: string) {
  return request<{ access_token: string; token_type: string }>('/auth/refresh', {
    method: 'POST',
    body: JSON.stringify({ refresh_token }),
  })
}

export function getProfile(token: string) {
  return request<UserData>('/profile', {
    headers: { Authorization: `Bearer ${token}` },
  })
}
