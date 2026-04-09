import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import {
  getOrganizationSettings,
  patchOrganizationSettings,
  type OrganizationSettings,
} from '../../api/accountOrganization'
import { fetchCountriesCatalog, type CountryRow } from '../../api/reference'

function normalizeOrg(row: OrganizationSettings): OrganizationSettings {
  return {
    ...row,
    enabled_country_codes:
      row.enabled_country_codes === undefined ? null : row.enabled_country_codes,
  }
}

export default function JobLocationsSettingsPage() {
  const { accountId: accountIdParam } = useParams<{ accountId: string }>()
  const accountId = accountIdParam ? Number(accountIdParam) : NaN
  const { getToken, loadProfile } = useAuth()
  const { success, error: showError } = useToast()
  const token = getToken()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<OrganizationSettings | null>(null)
  const [catalog, setCatalog] = useState<CountryRow[]>([])
  const [selectedCountryCodes, setSelectedCountryCodes] = useState<Set<string>>(new Set())
  const [countrySearch, setCountrySearch] = useState('')

  const load = useCallback(async () => {
    if (!token || !Number.isFinite(accountId)) return
    setLoading(true)
    try {
      const [row, countriesPayload] = await Promise.all([
        getOrganizationSettings(token, accountId),
        fetchCountriesCatalog(token),
      ])
      const cat = countriesPayload.countries
      setCatalog(cat)
      const normalized = normalizeOrg(row)
      setForm(normalized)
      const allCodes = new Set(cat.map(c => c.code))
      if (normalized.enabled_country_codes === null) {
        setSelectedCountryCodes(allCodes)
      } else {
        setSelectedCountryCodes(new Set(normalized.enabled_country_codes))
      }
    } catch (e) {
      showError('Could not load job locations', e instanceof Error ? e.message : undefined)
      setForm(null)
      setCatalog([])
    } finally {
      setLoading(false)
    }
  }, [token, accountId, showError])

  useEffect(() => {
    void load()
  }, [load])

  async function save() {
    if (!token || !form || !Number.isFinite(accountId)) return
    setSaving(true)
    try {
      const allCodes = catalog.map(c => c.code)
      const allSelected = catalog.length > 0 && selectedCountryCodes.size === allCodes.length
      const updated = await patchOrganizationSettings(token, accountId, {
        organization: {
          enabled_country_codes: allSelected ? null : [...selectedCountryCodes].sort(),
        },
      })
      const norm = normalizeOrg(updated)
      setForm(norm)
      if (norm.enabled_country_codes === null) {
        setSelectedCountryCodes(new Set(catalog.map(c => c.code)))
      } else {
        setSelectedCountryCodes(new Set(norm.enabled_country_codes))
      }
      await loadProfile()
      success('Saved', 'Job locations updated.')
    } catch (e) {
      showError('Save failed', e instanceof Error ? e.message : undefined)
    } finally {
      setSaving(false)
    }
  }

  const filteredCountries = useMemo(() => {
    const q = countrySearch.trim().toLowerCase()
    if (!q) return catalog
    return catalog.filter(c => c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q))
  }, [catalog, countrySearch])

  if (!token || !Number.isFinite(accountId)) return null

  return (
    <div className="settings-org-page">
      <p className="settings-lead">
        Countries are loaded from <code className="settings-inline-code">config/countries.yml</code>. Choose which appear
        in the Jobs page location filter. When all are selected, the setting is stored as “all countries” (default).
      </p>

      {loading || !form ? (
        <div className="esign-pro-loading">Loading…</div>
      ) : (
        <>
          <div className="settings-org-toolbar">
            <h2 className="settings-org-title">Job locations</h2>
            <button type="button" className="btn-primary btn-primary--inline" disabled={saving} onClick={() => void save()}>
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          </div>

          <div className="settings-org-section settings-org-field--wide">
            <div className="settings-country-toolbar">
              <input
                type="search"
                className="esign-pro-input settings-country-search"
                value={countrySearch}
                onChange={e => setCountrySearch(e.target.value)}
                placeholder="Search countries…"
                aria-label="Search countries"
              />
              <button
                type="button"
                className="esign-pro-btn-quiet"
                onClick={() => setSelectedCountryCodes(new Set(catalog.map(c => c.code)))}
              >
                Select all
              </button>
              <button type="button" className="esign-pro-btn-quiet" onClick={() => setSelectedCountryCodes(new Set())}>
                Clear all
              </button>
            </div>
            <div className="settings-country-grid" role="group" aria-label="Enabled countries">
              {filteredCountries.map(c => (
                <label key={c.code} className="settings-country-chip">
                  <input
                    type="checkbox"
                    checked={selectedCountryCodes.has(c.code)}
                    onChange={() => {
                      setSelectedCountryCodes(prev => {
                        const next = new Set(prev)
                        if (next.has(c.code)) next.delete(c.code)
                        else next.add(c.code)
                        return next
                      })
                    }}
                  />
                  <span>{c.name}</span>
                  <span className="settings-country-code">{c.code}</span>
                </label>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
