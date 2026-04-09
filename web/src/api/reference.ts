const BASE = '/api/v1'

export type CountryRow = { code: string; name: string }

function authHeaders(token: string) {
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
}

async function req<T>(path: string, token: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { headers: authHeaders(token) })
  const json = await res.json()
  if (!json.success) throw new Error(json.error || 'Request failed')
  return json.data as T
}

/** Full country catalog from config/countries.yml (ISO-style). */
export function fetchCountriesCatalog(token: string) {
  return req<{ countries: CountryRow[] }>('/reference/countries', token)
}
