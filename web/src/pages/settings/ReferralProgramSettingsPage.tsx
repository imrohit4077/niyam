import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../../auth/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import { referralsApi, type ReferralAccountSettings } from '../../api/referrals'

export default function ReferralProgramSettingsPage() {
  const { getToken, user } = useAuth()
  const { success, error: showError } = useToast()
  const token = getToken()
  const isAdmin = user?.role?.slug === 'admin'

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<ReferralAccountSettings | null>(null)

  const load = useCallback(async () => {
    if (!token) return
    setLoading(true)
    try {
      const row = await referralsApi.getAccountSettings(token)
      setForm(row)
    } catch (e) {
      showError('Could not load referral settings', e instanceof Error ? e.message : undefined)
      setForm(null)
    } finally {
      setLoading(false)
    }
  }, [token, showError])

  useEffect(() => {
    void load()
  }, [load])

  async function save() {
    if (!token || !form || !isAdmin) return
    setSaving(true)
    try {
      const updated = await referralsApi.updateAccountSettings(token, {
        enabled: form.enabled,
        public_apply_base_url: form.public_apply_base_url.trim(),
        notify_referrer_milestones: form.notify_referrer_milestones,
        hris_webhook_url: form.hris_webhook_url.trim(),
        hris_webhook_secret: form.hris_webhook_secret.trim(),
      })
      setForm(updated)
      success('Referral settings saved')
    } catch (e) {
      showError('Save failed', e instanceof Error ? e.message : undefined)
    } finally {
      setSaving(false)
    }
  }

  if (loading || !form) {
    return (
      <div className="esign-doc-page">
        <p className="text-muted">Loading…</p>
      </div>
    )
  }

  return (
    <div className="esign-doc-page">
      <header className="page-header">
        <h1 className="page-title">Referral program</h1>
        <p className="page-header-lead">
          Workspace-wide links, notifications, and HRIS webhook for bonus payouts. Per-job bonus amounts are set in each job’s{' '}
          <strong>Employee referrals</strong> step.
        </p>
      </header>

      {!isAdmin && (
        <div className="auth-error" style={{ marginBottom: 16 }}>
          Only workspace admins can change these settings. You can still use referral links from the Jobs editor and the Referrals hub.
        </div>
      )}

      <div className="job-editor-card" style={{ maxWidth: 640 }}>
        <label className="job-checkbox-label" style={{ marginBottom: 16 }}>
          <input
            type="checkbox"
            checked={form.enabled}
            disabled={!isAdmin}
            onChange={e => setForm(f => (f ? { ...f, enabled: e.target.checked } : f))}
          />
          Enable employee referrals for this workspace
        </label>

        <div className="esign-field" style={{ marginBottom: 16 }}>
          <label className="esign-label">Public API base URL</label>
          <p className="esign-hint" style={{ marginBottom: 8 }}>
            Used to build full shareable referral URLs (e.g. <code>https://api.yourdomain.com</code>). Candidates apply at{' '}
            <code>/apply/:token</code>; append <code>?ref=…</code> when sharing.
          </p>
          <input
            className="job-editor-input"
            value={form.public_apply_base_url}
            disabled={!isAdmin}
            onChange={e => setForm(f => (f ? { ...f, public_apply_base_url: e.target.value } : f))}
            placeholder="https://your-careers-site.com"
          />
        </div>

        <label className="job-checkbox-label" style={{ marginBottom: 16 }}>
          <input
            type="checkbox"
            checked={form.notify_referrer_milestones}
            disabled={!isAdmin}
            onChange={e => setForm(f => (f ? { ...f, notify_referrer_milestones: e.target.checked } : f))}
          />
          Notify referrers on pipeline milestones (requires background workers)
        </label>

        <h3 className="job-editor-card-title" style={{ marginTop: 8 }}>
          HRIS / payroll webhook
        </h3>
        <p className="job-editor-step-lead" style={{ marginTop: 0 }}>
          When a bonus becomes eligible, Forge can POST a JSON payload to your URL. Optional HMAC secret is sent as{' '}
          <code>X-Forge-Signature</code>.
        </p>
        <div className="esign-field" style={{ marginBottom: 12 }}>
          <label className="esign-label">Webhook URL</label>
          <input
            className="job-editor-input"
            value={form.hris_webhook_url}
            disabled={!isAdmin}
            onChange={e => setForm(f => (f ? { ...f, hris_webhook_url: e.target.value } : f))}
            placeholder="https://hris.example.com/hooks/referral-bonus"
          />
        </div>
        <div className="esign-field">
          <label className="esign-label">Webhook secret (optional)</label>
          <input
            className="job-editor-input"
            type="password"
            autoComplete="off"
            value={form.hris_webhook_secret}
            disabled={!isAdmin}
            onChange={e => setForm(f => (f ? { ...f, hris_webhook_secret: e.target.value } : f))}
            placeholder="••••••••"
          />
        </div>

        {isAdmin && (
          <div style={{ marginTop: 20 }}>
            <button type="button" className="btn-primary" onClick={() => void save()} disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
