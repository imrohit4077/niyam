import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { useAuth } from '../../auth/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import {
  communicationChannelsApi,
  type CommunicationChannelRow,
  type CreateChannelBody,
  type UpdateChannelBody,
} from '../../api/communicationChannels'

type Provider = 'gmail' | 'outlook' | 'smtp'
type AuthType = 'app_password' | 'oauth2'

const STATUS_LABEL: Record<string, string> = {
  pending_verification: 'Pending test',
  active: 'Active',
  error: 'Error',
  inactive: 'Inactive',
}

export default function CommunicationChannelsPage() {
  const { getToken } = useAuth()
  const { success, error: showError } = useToast()
  const token = getToken()
  const titleId = useId()
  const panelRef = useRef<HTMLDivElement>(null)

  const [rows, setRows] = useState<CommunicationChannelRow[]>([])
  const [loading, setLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<CommunicationChannelRow | null>(null)
  const [saving, setSaving] = useState(false)
  const [testingId, setTestingId] = useState<number | null>(null)

  const [name, setName] = useState('')
  const [provider, setProvider] = useState<Provider>('gmail')
  const [authType, setAuthType] = useState<AuthType>('app_password')
  const [displayEmail, setDisplayEmail] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [smtpHost, setSmtpHost] = useState('')
  const [smtpPort, setSmtpPort] = useState('587')
  const [imapHost, setImapHost] = useState('')
  const [imapPort, setImapPort] = useState('993')
  const [tenantId, setTenantId] = useState('common')
  const [clientId, setClientId] = useState('')
  const [clientSecret, setClientSecret] = useState('')
  const [refreshToken, setRefreshToken] = useState('')
  const [accessToken, setAccessToken] = useState('')

  const load = useCallback(async () => {
    if (!token) return
    setLoading(true)
    try {
      const data = await communicationChannelsApi.list(token, 'email')
      setRows(data)
    } catch (e) {
      showError('Could not load channels', e instanceof Error ? e.message : undefined)
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [token, showError])

  useEffect(() => {
    void load()
  }, [load])

  const resetForm = () => {
    setName('')
    setProvider('gmail')
    setAuthType('app_password')
    setDisplayEmail('')
    setDisplayName('')
    setUsername('')
    setPassword('')
    setSmtpHost('')
    setSmtpPort('587')
    setImapHost('')
    setImapPort('993')
    setTenantId('common')
    setClientId('')
    setClientSecret('')
    setRefreshToken('')
    setAccessToken('')
    setEditing(null)
  }

  const openCreate = () => {
    resetForm()
    setModalOpen(true)
  }

  const openEdit = (r: CommunicationChannelRow) => {
    setEditing(r)
    setName(r.name)
    setProvider(r.provider as Provider)
    const cfg = (r.config || {}) as Record<string, unknown>
    const at = (cfg.auth_type as string) || 'app_password'
    setAuthType(at === 'oauth2' ? 'oauth2' : 'app_password')
    setDisplayEmail(r.display_email ?? '')
    setDisplayName(r.display_name ?? '')
    setUsername('')
    setPassword('')
    setSmtpHost(String(cfg.smtp_host ?? ''))
    setSmtpPort(String(cfg.smtp_port ?? '587'))
    setImapHost(String(cfg.imap_host ?? ''))
    setImapPort(String(cfg.imap_port ?? '993'))
    setTenantId(String(cfg.tenant_id ?? 'common'))
    setClientId('')
    setClientSecret('')
    setRefreshToken('')
    setAccessToken('')
    setModalOpen(true)
  }

  const closeModal = () => {
    setModalOpen(false)
    resetForm()
  }

  useEffect(() => {
    if (!modalOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        closeModal()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      document.removeEventListener('keydown', onKey)
    }
  }, [modalOpen])

  useEffect(() => {
    if (!modalOpen) return
    const t = window.setTimeout(() => {
      panelRef.current?.querySelector<HTMLElement>('input')?.focus()
    }, 0)
    return () => window.clearTimeout(t)
  }, [modalOpen])

  const buildPayload = (): CreateChannelBody => {
    const config: Record<string, unknown> = { auth_type: authType }
    if (provider === 'smtp') {
      config.smtp_host = smtpHost.trim()
      config.smtp_port = parseInt(smtpPort, 10) || 587
      config.imap_host = imapHost.trim()
      config.imap_port = parseInt(imapPort, 10) || 993
      config.smtp_use_tls = true
      config.imap_use_ssl = true
    }
    if (provider === 'outlook' && authType === 'oauth2') {
      config.tenant_id = tenantId.trim() || 'common'
    }

    const credentials: Record<string, unknown> = {}
    if (authType === 'app_password') {
      credentials.username = username.trim()
      credentials.email = username.trim()
      if (password.trim()) credentials.password = password.trim()
    } else {
      credentials.client_id = clientId.trim()
      credentials.client_secret = clientSecret.trim()
      credentials.refresh_token = refreshToken.trim()
      if (accessToken.trim()) credentials.access_token = accessToken.trim()
      credentials.username = username.trim()
      credentials.email = username.trim()
    }

    return {
      name: name.trim(),
      channel_type: 'email',
      provider,
      display_email: displayEmail.trim() || null,
      display_name: displayName.trim() || null,
      config,
      credentials,
    }
  }

  const submit = async () => {
    if (!token) return
    const n = name.trim()
    if (!n) {
      showError('Name is required')
      return
    }
    if (provider === 'smtp') {
      if (!smtpHost.trim() || !imapHost.trim()) {
        showError('SMTP and IMAP host are required for custom SMTP')
        return
      }
    }
    if (authType === 'app_password') {
      if (!username.trim()) {
        showError('Email / username is required')
        return
      }
      if (!editing && !password.trim()) {
        showError('Password or app password is required')
        return
      }
    } else {
      if (!username.trim()) {
        showError('Mailbox email is required for OAuth2')
        return
      }
      if (!clientId.trim() || !clientSecret.trim() || !refreshToken.trim()) {
        showError('OAuth2 requires client ID, client secret, and refresh token')
        return
      }
    }

    setSaving(true)
    try {
      if (editing) {
        const body = buildPayload()
        const patch: UpdateChannelBody = {
          name: body.name,
          display_email: body.display_email,
          display_name: body.display_name,
          config: body.config,
        }
        if (authType === 'app_password') {
          if (password.trim()) {
            patch.credentials = body.credentials
          } else {
            patch.credentials = {
              username: username.trim(),
              email: username.trim(),
            }
          }
        } else {
          const creds: Record<string, unknown> = {}
          creds.username = username.trim()
          creds.email = username.trim()
          if (clientId.trim()) creds.client_id = clientId.trim()
          if (clientSecret.trim()) creds.client_secret = clientSecret.trim()
          if (refreshToken.trim()) creds.refresh_token = refreshToken.trim()
          if (accessToken.trim()) creds.access_token = accessToken.trim()
          patch.credentials = creds
        }
        await communicationChannelsApi.update(token, editing.id, patch)
        success('Channel updated')
      } else {
        await communicationChannelsApi.create(token, buildPayload())
        success('Channel created')
      }
      closeModal()
      await load()
    } catch (e) {
      showError('Save failed', e instanceof Error ? e.message : undefined)
    } finally {
      setSaving(false)
    }
  }

  const remove = async (r: CommunicationChannelRow) => {
    if (!token) return
    if (!window.confirm(`Delete channel “${r.name}”?`)) return
    try {
      await communicationChannelsApi.destroy(token, r.id)
      success('Channel deleted')
      await load()
    } catch (e) {
      showError('Delete failed', e instanceof Error ? e.message : undefined)
    }
  }

  const test = async (r: CommunicationChannelRow) => {
    if (!token) return
    setTestingId(r.id)
    try {
      await communicationChannelsApi.test(token, r.id)
      success('Connection successful — SMTP and IMAP verified')
      await load()
    } catch (e) {
      showError('Connection test failed', e instanceof Error ? e.message : undefined)
      await load()
    } finally {
      setTestingId(null)
    }
  }

  const setDefault = async (r: CommunicationChannelRow) => {
    if (!token) return
    try {
      await communicationChannelsApi.setDefault(token, r.id)
      success('Default channel updated')
      await load()
    } catch (e) {
      showError('Could not set default', e instanceof Error ? e.message : undefined)
    }
  }

  return (
    <div className="settings-labels-page">
      <div className="settings-org-toolbar">
        <div>
          <h2 className="settings-org-title" id={titleId}>
            Communication channels
          </h2>
          <p className="settings-lead settings-lead--tight">
            Connect outbound email (SMTP) and mailbox sync (IMAP). Start with Gmail, Outlook, or a custom SMTP
            server. Test the connection after saving credentials.
          </p>
        </div>
        <button type="button" className="btn-primary btn-primary--inline" onClick={openCreate}>
          + Add email channel
        </button>
      </div>

      {loading ? (
        <p className="settings-muted">Loading…</p>
      ) : rows.length === 0 ? (
        <div className="settings-labels-empty">
          <p>No email channels yet. Add one to send mail from your workspace.</p>
        </div>
      ) : (
        <div className="settings-labels-table-wrap">
          <table className="settings-labels-table" aria-labelledby={titleId}>
            <thead>
              <tr>
                <th scope="col">Name</th>
                <th scope="col">Provider</th>
                <th scope="col">Status</th>
                <th scope="col">Default</th>
                <th scope="col" className="settings-labels-col-actions">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.id}>
                  <td>
                    <span className="settings-labels-title-cell">{r.name}</span>
                    <div className="settings-muted" style={{ fontSize: '0.85rem', marginTop: 4 }}>
                      {r.display_email || '—'}
                    </div>
                    {r.status === 'error' && r.error_message ? (
                      <div style={{ marginTop: 6, fontSize: '0.8rem', color: 'var(--error)' }}>{r.error_message}</div>
                    ) : null}
                  </td>
                  <td>
                    <code className="settings-labels-code">{r.provider}</code>
                  </td>
                  <td>
                    <span
                      className={`tag ${
                        r.status === 'active' ? 'tag-green' : r.status === 'error' ? 'tag-red' : 'tag-gray'
                      }`}
                    >
                      {STATUS_LABEL[r.status] ?? r.status}
                    </span>
                  </td>
                  <td>{r.is_default ? 'Yes' : '—'}</td>
                  <td className="settings-labels-col-actions">
                    <button type="button" className="btn-link-quiet" onClick={() => void test(r)} disabled={testingId === r.id}>
                      {testingId === r.id ? 'Testing…' : 'Test'}
                    </button>
                    {!r.is_default ? (
                      <button type="button" className="btn-link-quiet" onClick={() => void setDefault(r)}>
                        Set default
                      </button>
                    ) : null}
                    <button type="button" className="btn-link-quiet" onClick={() => openEdit(r)}>
                      Edit
                    </button>
                    <button type="button" className="btn-link-quiet btn-link-quiet--danger" onClick={() => void remove(r)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modalOpen ? (
        <div
          className="esign-modal-backdrop"
          role="presentation"
          onClick={e => {
            if (e.target === e.currentTarget) closeModal()
          }}
        >
          <div
            ref={panelRef}
            className="esign-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby={`${titleId}-modal`}
            onClick={e => e.stopPropagation()}
          >
            <header className="esign-modal-header">
              <div>
                <h2 id={`${titleId}-modal`} className="esign-modal-title">
                  {editing ? 'Edit email channel' : 'Add email channel'}
                </h2>
                <p className="esign-modal-sub">
                  Hosts for Gmail and Outlook are filled automatically. Use “Test” after saving to verify SMTP and IMAP.
                </p>
              </div>
              <button type="button" className="esign-modal-close" onClick={closeModal} aria-label="Close">
                ×
              </button>
            </header>
            <div className="esign-modal-body">
              <div className="esign-field-block">
                <label htmlFor="ch-name">Name</label>
                <input
                  id="ch-name"
                  className="esign-pro-input"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g. Company Gmail"
                  autoComplete="off"
                />
              </div>
              <div className="esign-field-block">
                <label htmlFor="ch-provider">Provider</label>
                <select
                  id="ch-provider"
                  className="esign-pro-input"
                  value={provider}
                  onChange={e => setProvider(e.target.value as Provider)}
                  disabled={!!editing}
                >
                  <option value="gmail">Gmail</option>
                  <option value="outlook">Outlook / Microsoft 365</option>
                  <option value="smtp">Custom SMTP / IMAP</option>
                </select>
              </div>
              <div className="esign-field-block">
                <label htmlFor="ch-auth">Authentication</label>
                <select
                  id="ch-auth"
                  className="esign-pro-input"
                  value={authType}
                  onChange={e => setAuthType(e.target.value as AuthType)}
                >
                  <option value="app_password">App password / SMTP password</option>
                  <option value="oauth2">OAuth2 (client credentials + refresh token)</option>
                </select>
              </div>

              {provider === 'smtp' ? (
                <>
                  <div className="esign-field-block">
                    <label htmlFor="ch-smtp-host">SMTP host</label>
                    <input
                      id="ch-smtp-host"
                      className="esign-pro-input"
                      value={smtpHost}
                      onChange={e => setSmtpHost(e.target.value)}
                      placeholder="mail.example.com"
                    />
                  </div>
                  <div className="esign-field-block">
                    <label htmlFor="ch-smtp-port">SMTP port</label>
                    <input
                      id="ch-smtp-port"
                      className="esign-pro-input"
                      value={smtpPort}
                      onChange={e => setSmtpPort(e.target.value)}
                      inputMode="numeric"
                    />
                  </div>
                  <div className="esign-field-block">
                    <label htmlFor="ch-imap-host">IMAP host</label>
                    <input
                      id="ch-imap-host"
                      className="esign-pro-input"
                      value={imapHost}
                      onChange={e => setImapHost(e.target.value)}
                      placeholder="mail.example.com"
                    />
                  </div>
                  <div className="esign-field-block">
                    <label htmlFor="ch-imap-port">IMAP port</label>
                    <input
                      id="ch-imap-port"
                      className="esign-pro-input"
                      value={imapPort}
                      onChange={e => setImapPort(e.target.value)}
                      inputMode="numeric"
                    />
                  </div>
                </>
              ) : null}

              {provider === 'outlook' && authType === 'oauth2' ? (
                <div className="esign-field-block">
                  <label htmlFor="ch-tenant">Azure tenant ID</label>
                  <input
                    id="ch-tenant"
                    className="esign-pro-input"
                    value={tenantId}
                    onChange={e => setTenantId(e.target.value)}
                    placeholder="common or directory ID"
                  />
                </div>
              ) : null}

              <div className="esign-field-block">
                <label htmlFor="ch-from-email">From email (optional)</label>
                <input
                  id="ch-from-email"
                  className="esign-pro-input"
                  value={displayEmail}
                  onChange={e => setDisplayEmail(e.target.value)}
                  placeholder="recipients@example.com"
                  type="email"
                />
              </div>
              <div className="esign-field-block">
                <label htmlFor="ch-from-name">From name (optional)</label>
                <input
                  id="ch-from-name"
                  className="esign-pro-input"
                  value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                  placeholder="Acme Recruiting"
                />
              </div>

              {authType === 'app_password' ? (
                <>
                  <div className="esign-field-block">
                    <label htmlFor="ch-user">Email / username</label>
                    <input
                      id="ch-user"
                      className="esign-pro-input"
                      value={username}
                      onChange={e => setUsername(e.target.value)}
                      type="email"
                      autoComplete="username"
                    />
                  </div>
                  <div className="esign-field-block">
                    <label htmlFor="ch-pass">{editing ? 'New password (leave blank to keep)' : 'App password or SMTP password'}</label>
                    <input
                      id="ch-pass"
                      className="esign-pro-input"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      type="password"
                      autoComplete="new-password"
                    />
                  </div>
                </>
              ) : (
                <>
                  <div className="esign-field-block">
                    <label htmlFor="ch-mailbox">Mailbox email</label>
                    <input
                      id="ch-mailbox"
                      className="esign-pro-input"
                      value={username}
                      onChange={e => setUsername(e.target.value)}
                      type="email"
                      autoComplete="username"
                    />
                  </div>
                  <div className="esign-field-block">
                    <label htmlFor="ch-cid">OAuth client ID</label>
                    <input
                      id="ch-cid"
                      className="esign-pro-input"
                      value={clientId}
                      onChange={e => setClientId(e.target.value)}
                      autoComplete="off"
                    />
                  </div>
                  <div className="esign-field-block">
                    <label htmlFor="ch-csec">OAuth client secret</label>
                    <input
                      id="ch-csec"
                      className="esign-pro-input"
                      value={clientSecret}
                      onChange={e => setClientSecret(e.target.value)}
                      type="password"
                      autoComplete="new-password"
                    />
                  </div>
                  <div className="esign-field-block">
                    <label htmlFor="ch-refresh">Refresh token</label>
                    <input
                      id="ch-refresh"
                      className="esign-pro-input"
                      value={refreshToken}
                      onChange={e => setRefreshToken(e.target.value)}
                      autoComplete="off"
                    />
                  </div>
                  <div className="esign-field-block">
                    <label htmlFor="ch-access">Access token (optional)</label>
                    <input
                      id="ch-access"
                      className="esign-pro-input"
                      value={accessToken}
                      onChange={e => setAccessToken(e.target.value)}
                      autoComplete="off"
                    />
                  </div>
                </>
              )}
            </div>
            <footer className="esign-modal-footer">
              <button type="button" className="esign-pro-btn-quiet" onClick={closeModal} disabled={saving}>
                Cancel
              </button>
              <button type="button" className="btn-primary btn-primary--inline" onClick={() => void submit()} disabled={saving}>
                {saving ? 'Saving…' : editing ? 'Save changes' : 'Create channel'}
              </button>
            </footer>
          </div>
        </div>
      ) : null}
    </div>
  )
}
