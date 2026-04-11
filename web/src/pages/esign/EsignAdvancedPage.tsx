import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../../auth/AuthContext'
import { esignApi, type EsignAccountSettings } from '../../api/esign'
import { useToast } from '../../contexts/ToastContext'

export default function EsignAdvancedPage() {
  const { getToken } = useAuth()
  const { error: showError, success: showSuccess } = useToast()
  const token = getToken()
  const [settings, setSettings] = useState<EsignAccountSettings | null>(null)
  const [fieldMapText, setFieldMapText] = useState('{}')
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!token) return
    setLoading(true)
    try {
      const s = await esignApi.getSettings(token)
      setSettings(s)
      setFieldMapText(JSON.stringify(s.field_map || {}, null, 2))
    } catch (e) {
      showError('Could not load settings', e instanceof Error ? e.message : undefined)
    } finally {
      setLoading(false)
    }
  }, [token, showError])

  useEffect(() => {
    void load()
  }, [load])

  async function save() {
    if (!token) return
    let field_map: Record<string, string> = {}
    try {
      const parsed = JSON.parse(fieldMapText || '{}')
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        field_map = Object.fromEntries(
          Object.entries(parsed as Record<string, unknown>).map(([k, v]) => [k, String(v)]),
        )
      } else throw new Error('invalid')
    } catch {
      showError('Invalid JSON', 'Field map must be a single JSON object.')
      return
    }
    try {
      const next = await esignApi.patchSettings(token, {
        webhook_secret: settings?.webhook_secret ?? '',
        field_map,
      })
      setSettings(next)
      showSuccess('Saved')
    } catch (e) {
      showError('Save failed', e instanceof Error ? e.message : undefined)
    }
  }

  if (!token) return null

  return (
    <div className="esign-page-pro">
      <div className="esign-pro-toolbar">
        <div>
          <h2 className="esign-pro-section-title">Advanced</h2>
          <p className="esign-pro-section-sub">Webhooks and custom merge-field mapping. Optional for in-app signing.</p>
        </div>
      </div>

      {loading ? (
        <div className="esign-pro-loading">Loading…</div>
      ) : (
        <section className="esign-pro-card">
          <div className="esign-field-block">
            <label>Webhook HMAC secret</label>
            <input
              className="esign-pro-input"
              type="password"
              autoComplete="new-password"
              value={settings?.webhook_secret || ''}
              onChange={e =>
                setSettings(s => ({ ...(s || ({} as EsignAccountSettings)), webhook_secret: e.target.value }))
              }
            />
          </div>
          <div className="esign-field-block">
            <label>Custom field map (JSON)</label>
            <textarea className="esign-pro-textarea" rows={8} value={fieldMapText} onChange={e => setFieldMapText(e.target.value)} />
          </div>
          <button type="button" className="btn-primary" onClick={() => void save()}>
            Save
          </button>
          <p className="esign-pro-api-ref">
            Endpoint <code>POST /api/v1/webhooks/esign</code> · header <code>X-Niyam-Esign-Signature</code>
          </p>
        </section>
      )}
    </div>
  )
}
