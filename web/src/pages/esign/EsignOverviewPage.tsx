import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../../auth/AuthContext'
import { esignApi, type EsignAccountSettings } from '../../api/esign'
import { useToast } from '../../contexts/ToastContext'

export default function EsignOverviewPage() {
  const { getToken } = useAuth()
  const { error: showError, success: showSuccess } = useToast()
  const token = getToken()
  const [settings, setSettings] = useState<EsignAccountSettings | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!token) return
    setLoading(true)
    try {
      setSettings(await esignApi.getSettings(token))
    } catch (e) {
      showError('Could not load settings', e instanceof Error ? e.message : undefined)
    } finally {
      setLoading(false)
    }
  }, [token, showError])

  useEffect(() => {
    void load()
  }, [load])

  async function saveUrl() {
    if (!token) return
    try {
      const next = await esignApi.patchSettings(token, {
        frontend_base_url: settings?.frontend_base_url ?? '',
      })
      setSettings(next)
      showSuccess('Saved', 'Candidate signing links use this base URL.')
    } catch (e) {
      showError('Save failed', e instanceof Error ? e.message : undefined)
    }
  }

  if (!token) return null

  return (
    <div className="esign-page-pro">
      {loading ? (
        <div className="esign-pro-loading" aria-busy="true">
          Loading…
        </div>
      ) : (
        <>
          <section className="esign-pro-card">
            <h2 className="esign-pro-card-title">Signing URL</h2>
            <p className="esign-pro-card-desc">
              Production app origin where candidates open documents (e.g. your deployed frontend). Paths are appended as{' '}
              <code className="esign-pro-code">/esign/sign/…</code>.
            </p>
            <label className="esign-pro-label" htmlFor="esign-base-url">
              Base URL
            </label>
            <div className="esign-pro-row">
              <input
                id="esign-base-url"
                className="esign-pro-input"
                type="url"
                placeholder="https://app.yourcompany.com"
                autoComplete="url"
                value={settings?.frontend_base_url || ''}
                onChange={e =>
                  setSettings(s => ({ ...(s || ({} as EsignAccountSettings)), frontend_base_url: e.target.value }))
                }
              />
              <button type="button" className="btn-primary" onClick={() => void saveUrl()}>
                Save
              </button>
            </div>
          </section>

          <section className="esign-pro-card esign-pro-card--muted">
            <h2 className="esign-pro-card-title">Background worker</h2>
            <p className="esign-pro-card-desc">
              Queue processing for automated sends requires a worker. Run{' '}
              <code className="esign-pro-code">python manage.py worker</code> or{' '}
              <code className="esign-pro-code">celery -A config.celery worker -l info</code>. If the broker is
              unavailable, the API may run automations inline (slower).
            </p>
          </section>
        </>
      )}
    </div>
  )
}
