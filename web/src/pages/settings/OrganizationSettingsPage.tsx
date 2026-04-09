import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import {
  getOrganizationSettings,
  patchOrganizationSettings,
  type OrganizationSettings,
} from '../../api/accountOrganization'

const LANGUAGES: { value: string; label: string }[] = [
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Spanish' },
  { value: 'fr', label: 'French' },
  { value: 'de', label: 'German' },
  { value: 'hi', label: 'Hindi' },
  { value: 'pt', label: 'Portuguese' },
  { value: 'zh', label: 'Chinese (Mandarin)' },
  { value: 'ja', label: 'Japanese' },
]

const CURRENCIES: { value: string; label: string }[] = [
  { value: 'USD', label: 'USD — US Dollar' },
  { value: 'EUR', label: 'EUR — Euro' },
  { value: 'GBP', label: 'GBP — British Pound' },
  { value: 'INR', label: 'INR — Indian Rupee' },
  { value: 'CAD', label: 'CAD — Canadian Dollar' },
  { value: 'AUD', label: 'AUD — Australian Dollar' },
  { value: 'JPY', label: 'JPY — Japanese Yen' },
  { value: 'CHF', label: 'CHF — Swiss Franc' },
]

function timeZoneOptions(): string[] {
  try {
    const fn = (Intl as unknown as { supportedValuesOf?: (k: string) => string[] }).supportedValuesOf
    if (typeof fn === 'function') return [...fn('timeZone')].sort()
  } catch {
    /* ignore */
  }
  return [
    'UTC',
    'America/New_York',
    'America/Chicago',
    'America/Denver',
    'America/Los_Angeles',
    'America/Toronto',
    'America/Sao_Paulo',
    'Europe/London',
    'Europe/Paris',
    'Europe/Berlin',
    'Asia/Dubai',
    'Asia/Kolkata',
    'Asia/Singapore',
    'Asia/Tokyo',
    'Australia/Sydney',
  ]
}

function normalizeOrg(row: OrganizationSettings): OrganizationSettings {
  return { ...row }
}

export default function OrganizationSettingsPage() {
  const { accountId: accountIdParam } = useParams<{ accountId: string }>()
  const accountId = accountIdParam ? Number(accountIdParam) : NaN
  const { getToken, loadProfile } = useAuth()
  const { success, error: showError } = useToast()
  const token = getToken()

  const zones = useMemo(() => timeZoneOptions(), [])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<OrganizationSettings | null>(null)

  const load = useCallback(async () => {
    if (!token || !Number.isFinite(accountId)) return
    setLoading(true)
    try {
      const row = await getOrganizationSettings(token, accountId)
      setForm(normalizeOrg(row))
    } catch (e) {
      showError('Could not load organization settings', e instanceof Error ? e.message : undefined)
      setForm(null)
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
      const updated = await patchOrganizationSettings(token, accountId, {
        name: form.name.trim(),
        organization: {
          logo_url: form.logo_url.trim(),
          careers_page_url: form.careers_page_url.trim(),
          default_language: form.default_language,
          default_currency: form.default_currency,
          timezone: form.timezone,
        },
      })
      setForm(normalizeOrg(updated))
      await loadProfile()
      success('Saved', 'Organization settings updated.')
    } catch (e) {
      showError('Save failed', e instanceof Error ? e.message : undefined)
    } finally {
      setSaving(false)
    }
  }

  const zoneChoices = useMemo(() => {
    if (!form) return zones
    if (!zones.includes(form.timezone)) return [form.timezone, ...zones]
    return zones
  }, [zones, form])

  if (!token || !Number.isFinite(accountId)) return null

  return (
    <div className="settings-org-page">
      <p className="settings-lead">
        These values apply across your workspace. <strong>Timezone</strong> is used for dates and scheduling context in
        the app. Manage <strong>departments</strong> and <strong>job location countries</strong> from the{' '}
        <strong>Departments</strong> and <strong>Job locations</strong> items in the General sidebar.
      </p>

      {loading || !form ? (
        <div className="esign-pro-loading">Loading…</div>
      ) : (
        <>
          <div className="settings-org-toolbar">
            <h2 className="settings-org-title">Organization</h2>
            <button type="button" className="btn-primary btn-primary--inline" disabled={saving} onClick={() => void save()}>
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          </div>

          <div className="settings-org-grid">
            <div className="esign-field-block">
              <label htmlFor="org-name">Company name</label>
              <input
                id="org-name"
                className="esign-pro-input"
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                autoComplete="organization"
              />
            </div>

            <div className="esign-field-block settings-org-field--wide">
              <label htmlFor="org-logo">Logo / branding URL</label>
              <input
                id="org-logo"
                className="esign-pro-input"
                value={form.logo_url}
                onChange={e => setForm({ ...form, logo_url: e.target.value })}
                placeholder="https://…"
                inputMode="url"
              />
              <p className="settings-field-hint">Public URL to your logo image (PNG or SVG recommended).</p>
            </div>

            <div className="esign-field-block settings-org-field--wide">
              <label htmlFor="org-careers">Careers page URL</label>
              <input
                id="org-careers"
                className="esign-pro-input"
                value={form.careers_page_url}
                onChange={e => setForm({ ...form, careers_page_url: e.target.value })}
                placeholder="https://jobs.yourcompany.com"
                inputMode="url"
              />
            </div>

            <div className="esign-field-block">
              <label htmlFor="org-lang">Default language</label>
              <select
                id="org-lang"
                className="esign-pro-input"
                value={form.default_language}
                onChange={e => setForm({ ...form, default_language: e.target.value })}
              >
                {LANGUAGES.map(o => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="esign-field-block">
              <label htmlFor="org-currency">Default currency</label>
              <select
                id="org-currency"
                className="esign-pro-input"
                value={form.default_currency}
                onChange={e => setForm({ ...form, default_currency: e.target.value })}
              >
                {CURRENCIES.map(o => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="esign-field-block settings-org-field--wide settings-org-field--timezone">
              <label htmlFor="org-tz">Timezone</label>
              <select
                id="org-tz"
                className="esign-pro-input"
                value={form.timezone}
                onChange={e => setForm({ ...form, timezone: e.target.value })}
              >
                {zoneChoices.map(z => (
                  <option key={z} value={z}>
                    {z}
                  </option>
                ))}
              </select>
              <p className="settings-field-hint settings-field-hint--emphasis">
                IANA timezone (e.g. America/New_York). Used for consistent timestamps and scheduling.
              </p>
            </div>

          </div>
        </>
      )}
    </div>
  )
}
