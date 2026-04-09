import { useCallback, useEffect, useId, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
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

/**
 * Full-viewport email channel setup: Gmail OAuth, then manual Outlook/SMTP, connected accounts list.
 */
export default function CommunicationChannelsEmailPage() {
  const { accountId } = useParams<{ accountId: string }>()
  const { getToken } = useAuth()
  const { success, error: showError } = useToast()
  const token = getToken()
  const titleId = useId()
  const [searchParams, setSearchParams] = useSearchParams()

  const hubPath = `/account/${accountId}/settings/communication-channels`

  const [rows, setRows] = useState<CommunicationChannelRow[]>([])
  const [loading, setLoading] = useState(false)
  const [testingId, setTestingId] = useState<number | null>(null)
  const [oauthStarting, setOauthStarting] = useState(false)
  const [showManual, setShowManual] = useState(false)

  const [name, setName] = useState('')
  const [provider, setProvider] = useState<Provider>('outlook')
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
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState<CommunicationChannelRow | null>(null)

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

  useEffect(() => {
    const oauth = searchParams.get('oauth')
    const err = searchParams.get('oauth_error')
    if (oauth === 'gmail_ok') {
      success('Gmail account connected. Use Test to verify SMTP and IMAP.')
      setSearchParams({}, { replace: true })
      void load()
      return
    }
    if (err) {
      showError('Google sign-in did not complete', decodeURIComponent(err))
      setSearchParams({}, { replace: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- OAuth return URL query only
  }, [searchParams])

  const startGoogleOAuth = async () => {
    if (!token) return
    setOauthStarting(true)
    try {
      const { authorization_url } = await communicationChannelsApi.googleOAuthAuthorize(token)
      window.location.href = authorization_url
    } catch (e) {
      showError(
        'Could not start Google sign-in',
        e instanceof Error ? e.message : 'Configure GOOGLE_OAUTH_* on the API server.',
      )
      setOauthStarting(false)
    }
  }

  const resetManualForm = () => {
    setName('')
    setProvider('outlook')
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
    setShowManual(true)
  }

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

  const submitManual = async () => {
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
            patch.credentials = { username: username.trim(), email: username.trim() }
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
      resetManualForm()
      setShowManual(false)
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
    <div className="comm-channels-email-full" id={titleId}>
      <div className="comm-channels-email-inner">
        <nav className="comm-channels-email-back">
          <Link to={hubPath} className="comm-channels-back-link">
            ← Communication channels
          </Link>
        </nav>

        <header className="comm-channels-email-hero">
          <h1 className="comm-channels-email-title">Email</h1>
          <p className="comm-channels-email-lead">
            Connect outbound SMTP and mailbox IMAP. Use Google sign-in for Gmail, or add Outlook / custom SMTP below.
          </p>
        </header>

        <section className="comm-channels-oauth-panel" aria-labelledby="gmail-oauth-title">
          <div className="comm-channels-oauth-card">
            <div className="comm-channels-oauth-brand">
              <svg width={48} height={48} viewBox="0 0 48 48" aria-hidden>
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l-9.21 7.4-9.21-7.4c2.5-2.38 5.67-3.6 9.21-3.6z" />
                <path fill="#4285F4" d="M38.48 24c0-1.55-.28-3.04-.8-4.42H24v8.45h8.12c-.44 2.23-1.76 4.13-3.73 5.38l5.98 4.64C36.57 35.03 38.48 29.98 38.48 24z" />
                <path fill="#FBBC05" d="M14.92 28.18c-.48-1.45-.76-2.99-.76-4.58s.27-3.13.76-4.58L8.94 14.38C7.27 17.51 6.32 21.14 6.32 24s.95 6.49 2.62 9.62l5.98-4.44z" />
                <path fill="#34A853" d="M24 38.32c3.19 0 5.86-1.05 7.82-2.87l-5.98-4.64c-1.67 1.12-3.81 1.78-6.16 1.78-4.79 0-8.86-3.23-10.33-7.64l-6.02 4.63C8.57 36.21 15.7 41.5 24 41.5c5.25 0 9.65-1.73 12.86-4.7l-5.98-4.64c-1.82 1.15-4.15 1.84-6.88 1.84z" />
              </svg>
            </div>
            <div className="comm-channels-oauth-copy">
              <h2 id="gmail-oauth-title" className="comm-channels-oauth-heading">
                Connect Gmail account
              </h2>
              <p className="comm-channels-oauth-text">
                Sign in with Google to authorize SMTP and IMAP for this workspace. The API must have{' '}
                <code className="comm-channels-code">GOOGLE_OAUTH_CLIENT_ID</code>,{' '}
                <code className="comm-channels-code">GOOGLE_OAUTH_CLIENT_SECRET</code>, and a matching{' '}
                <code className="comm-channels-code">GOOGLE_OAUTH_REDIRECT_URI</code> in Google Cloud Console.
              </p>
              <button
                type="button"
                className="btn-primary comm-channels-oauth-btn"
                onClick={() => void startGoogleOAuth()}
                disabled={oauthStarting}
              >
                {oauthStarting ? 'Redirecting…' : 'Continue with Google'}
              </button>
            </div>
          </div>
        </section>

        <section className="comm-channels-manual-section">
          <button
            type="button"
            className="comm-channels-manual-toggle"
            onClick={() => {
              if (showManual) {
                resetManualForm()
              }
              setShowManual(s => !s)
            }}
            aria-expanded={showManual}
          >
            {showManual ? 'Hide manual setup' : 'Outlook / custom SMTP (manual credentials)'}
          </button>

          {showManual ? (
            <div className="comm-channels-manual-form">
              <p className="settings-muted comm-channels-manual-hint">
                {editing ? `Editing “${editing.name}”` : 'Add a channel without Google OAuth.'}
              </p>
              <div className="esign-field-block">
                <label htmlFor="m-name">Name</label>
                <input
                  id="m-name"
                  className="esign-pro-input"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g. Support mailbox"
                />
              </div>
              <div className="esign-field-block">
                <label htmlFor="m-provider">Provider</label>
                <select
                  id="m-provider"
                  className="esign-pro-input"
                  value={provider}
                  onChange={e => setProvider(e.target.value as Provider)}
                  disabled={!!editing}
                >
                  <option value="outlook">Outlook / Microsoft 365</option>
                  <option value="smtp">Custom SMTP / IMAP</option>
                  <option value="gmail">Gmail (app password)</option>
                </select>
              </div>
              <div className="esign-field-block">
                <label htmlFor="m-auth">Authentication</label>
                <select
                  id="m-auth"
                  className="esign-pro-input"
                  value={authType}
                  onChange={e => setAuthType(e.target.value as AuthType)}
                >
                  <option value="app_password">App password / SMTP password</option>
                  <option value="oauth2">OAuth2 (manual tokens)</option>
                </select>
              </div>

              {provider === 'smtp' ? (
                <>
                  <div className="esign-field-block">
                    <label htmlFor="m-smtp-host">SMTP host</label>
                    <input
                      id="m-smtp-host"
                      className="esign-pro-input"
                      value={smtpHost}
                      onChange={e => setSmtpHost(e.target.value)}
                    />
                  </div>
                  <div className="esign-field-block">
                    <label htmlFor="m-smtp-port">SMTP port</label>
                    <input
                      id="m-smtp-port"
                      className="esign-pro-input"
                      value={smtpPort}
                      onChange={e => setSmtpPort(e.target.value)}
                      inputMode="numeric"
                    />
                  </div>
                  <div className="esign-field-block">
                    <label htmlFor="m-imap-host">IMAP host</label>
                    <input
                      id="m-imap-host"
                      className="esign-pro-input"
                      value={imapHost}
                      onChange={e => setImapHost(e.target.value)}
                    />
                  </div>
                  <div className="esign-field-block">
                    <label htmlFor="m-imap-port">IMAP port</label>
                    <input
                      id="m-imap-port"
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
                  <label htmlFor="m-tenant">Azure tenant ID</label>
                  <input
                    id="m-tenant"
                    className="esign-pro-input"
                    value={tenantId}
                    onChange={e => setTenantId(e.target.value)}
                    placeholder="common"
                  />
                </div>
              ) : null}

              <div className="esign-field-block">
                <label htmlFor="m-from-email">From email (optional)</label>
                <input
                  id="m-from-email"
                  className="esign-pro-input"
                  value={displayEmail}
                  onChange={e => setDisplayEmail(e.target.value)}
                  type="email"
                />
              </div>
              <div className="esign-field-block">
                <label htmlFor="m-from-name">From name (optional)</label>
                <input
                  id="m-from-name"
                  className="esign-pro-input"
                  value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                />
              </div>

              {authType === 'app_password' ? (
                <>
                  <div className="esign-field-block">
                    <label htmlFor="m-user">Email / username</label>
                    <input
                      id="m-user"
                      className="esign-pro-input"
                      value={username}
                      onChange={e => setUsername(e.target.value)}
                      type="email"
                      autoComplete="username"
                    />
                  </div>
                  <div className="esign-field-block">
                    <label htmlFor="m-pass">{editing ? 'New password (leave blank to keep)' : 'Password'}</label>
                    <input
                      id="m-pass"
                      className="esign-pro-input"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      type="password"
                    />
                  </div>
                </>
              ) : (
                <>
                  <div className="esign-field-block">
                    <label htmlFor="m-mailbox">Mailbox email</label>
                    <input
                      id="m-mailbox"
                      className="esign-pro-input"
                      value={username}
                      onChange={e => setUsername(e.target.value)}
                      type="email"
                    />
                  </div>
                  <div className="esign-field-block">
                    <label htmlFor="m-cid">OAuth client ID</label>
                    <input id="m-cid" className="esign-pro-input" value={clientId} onChange={e => setClientId(e.target.value)} />
                  </div>
                  <div className="esign-field-block">
                    <label htmlFor="m-csec">OAuth client secret</label>
                    <input
                      id="m-csec"
                      className="esign-pro-input"
                      value={clientSecret}
                      onChange={e => setClientSecret(e.target.value)}
                      type="password"
                    />
                  </div>
                  <div className="esign-field-block">
                    <label htmlFor="m-refresh">Refresh token</label>
                    <input
                      id="m-refresh"
                      className="esign-pro-input"
                      value={refreshToken}
                      onChange={e => setRefreshToken(e.target.value)}
                    />
                  </div>
                  <div className="esign-field-block">
                    <label htmlFor="m-access">Access token (optional)</label>
                    <input
                      id="m-access"
                      className="esign-pro-input"
                      value={accessToken}
                      onChange={e => setAccessToken(e.target.value)}
                    />
                  </div>
                </>
              )}

              <div className="comm-channels-manual-actions">
                <button
                  type="button"
                  className="esign-pro-btn-quiet"
                  onClick={() => {
                    resetManualForm()
                    setEditing(null)
                  }}
                >
                  Clear
                </button>
                <button type="button" className="btn-primary btn-primary--inline" onClick={() => void submitManual()} disabled={saving}>
                  {saving ? 'Saving…' : editing ? 'Save changes' : 'Add channel'}
                </button>
              </div>
            </div>
          ) : null}
        </section>

        <section className="comm-channels-list-section" aria-labelledby="connected-title">
          <h2 id="connected-title" className="comm-channels-list-heading">
            Connected accounts
          </h2>
          {loading ? (
            <p className="settings-muted">Loading…</p>
          ) : rows.length === 0 ? (
            <div className="settings-labels-empty">
              <p>No email channels yet. Connect Gmail above or add credentials manually.</p>
            </div>
          ) : (
            <div className="settings-labels-table-wrap">
              <table className="settings-labels-table">
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
                          className={`tag ${r.status === 'active' ? 'tag-green' : r.status === 'error' ? 'tag-red' : 'tag-gray'}`}
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
        </section>
      </div>
    </div>
  )
}
