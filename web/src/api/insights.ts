const BASE = '/api/v1'

export interface InsightsDashboardRef {
  id: number
  name: string
}

export interface InsightsSettingsPayload {
  insights_dashboards: InsightsDashboardRef[]
}

async function readApiJson(res: Response): Promise<{ success?: boolean; data?: unknown; error?: string }> {
  return (await res.json()) as { success?: boolean; data?: unknown; error?: string }
}

async function req<T>(path: string, token: string, accountId?: number | string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
    ...((options.headers as Record<string, string> | undefined) ?? {}),
  }
  if (accountId !== undefined && accountId !== null && String(accountId).trim() !== '') {
    headers['X-Account-Id'] = String(accountId)
  }
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers,
  })
  const body = await readApiJson(res)
  if (!res.ok || body.success === false) {
    throw new Error(body.error || res.statusText || 'Request failed')
  }
  return body.data as T
}

export function getInsightsSettings(token: string, accountId: number | string) {
  return req<InsightsSettingsPayload>('/account/insights_settings', token, accountId)
}

export function patchInsightsSettings(token: string, accountId: number | string, body: InsightsSettingsPayload) {
  return req<InsightsSettingsPayload>('/account/insights_settings', token, accountId, {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
}

export function getMetabaseDashboardEmbed(token: string, accountId: number | string, dashboardId: number) {
  return req<{ embed_url: string }>(`/metabase/dashboard/${dashboardId}`, token, accountId)
}
