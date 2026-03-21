const BASE = '/api/v1'

export interface AppearanceSettings {
  font_preset: string
  font_family_css: string
  font_size_px: number
}

async function readApiJson(res: Response): Promise<{ success?: boolean; data?: unknown; error?: string }> {
  return (await res.json()) as { success?: boolean; data?: unknown; error?: string }
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

export function getAppearanceSettings(token: string) {
  return req<AppearanceSettings>('/account/appearance_settings', token)
}

export function patchAppearanceSettings(token: string, body: Partial<Pick<AppearanceSettings, 'font_preset' | 'font_size_px'>>) {
  return req<AppearanceSettings>('/account/appearance_settings', token, {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
}
