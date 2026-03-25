import { Link, useParams } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'

export default function WorkspaceSettingsPage() {
  const { user } = useAuth()
  const { accountId } = useParams<{ accountId: string }>()
  const acc = user?.account

  return (
    <div className="settings-org-page settings-workspace-page">
      <p className="settings-lead">
        Workspace identifiers and shortcuts. Edit company details under <strong>Organization</strong> in the left menu.
      </p>

      <div className="settings-org-toolbar">
        <h2 className="settings-org-title">Workspace</h2>
      </div>
      <div className="settings-org-grid">
        <div className="esign-field-block">
          <label htmlFor="ws-name">Name</label>
          <p id="ws-name" className="settings-workspace-value">
            {acc?.name ?? '—'}
          </p>
        </div>
        <div className="esign-field-block">
          <label htmlFor="ws-slug">Slug</label>
          <code id="ws-slug" className="settings-workspace-code">
            {acc?.slug ?? '—'}
          </code>
        </div>
        {acc?.plan && (
          <div className="esign-field-block">
            <label htmlFor="ws-plan">Plan</label>
            <p id="ws-plan" className="settings-workspace-value">
              {acc.plan}
            </p>
          </div>
        )}
      </div>

      <div className="settings-org-toolbar settings-workspace-toolbar-spaced">
        <h2 className="settings-org-title">Your account</h2>
      </div>
      <div className="settings-org-grid">
        <div className="esign-field-block">
          <label htmlFor="ws-email">Signed in as</label>
          <p id="ws-email" className="settings-workspace-value">
            {user?.email ?? '—'}
          </p>
        </div>
        <div className="esign-field-block">
          <label htmlFor="ws-profile">Profile</label>
          <p id="ws-profile" className="settings-workspace-value">
            <Link to={`/account/${accountId}/profile`} className="settings-inline-link">
              Edit profile & role →
            </Link>
          </p>
        </div>
      </div>

      <div className="settings-workspace-esign">
        <h3 className="settings-workspace-esign-title">E-sign (built-in)</h3>
        <p className="settings-field-hint settings-field-hint--emphasis settings-workspace-esign-desc">
          Send offer letters and agreements when someone moves on the pipeline — candidates sign in your app, no
          external provider.
        </p>
        <Link to={`/account/${accountId}/settings/esign`} className="btn-primary btn-primary--inline">
          Open E-sign setup
        </Link>
      </div>
    </div>
  )
}
