import { Link, useOutletContext } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import type { DashboardOutletContext } from '../layouts/DashboardOutletContext'

export default function GeneralSettingsView() {
  const { user } = useAuth()
  const { accountId } = useOutletContext<DashboardOutletContext>()
  const acc = user?.account

  return (
    <div className="settings-general">
      <p className="settings-lead">
        Workspace overview. For <strong>E-sign</strong> (in-app offer letters &amp; agreements), use the E-sign tab above
        or the shortcut in the sidebar.
      </p>

      <div className="settings-cards">
        <section className="settings-card">
          <h2 className="settings-card-title">Workspace</h2>
          <dl className="settings-dl">
            <div>
              <dt>Name</dt>
              <dd>{acc?.name ?? '—'}</dd>
            </div>
            <div>
              <dt>Slug</dt>
              <dd>
                <code>{acc?.slug ?? '—'}</code>
              </dd>
            </div>
            {acc?.plan && (
              <div>
                <dt>Plan</dt>
                <dd>{acc.plan}</dd>
              </div>
            )}
          </dl>
        </section>

        <section className="settings-card">
          <h2 className="settings-card-title">Your account</h2>
          <dl className="settings-dl">
            <div>
              <dt>Signed in as</dt>
              <dd>{user?.email}</dd>
            </div>
            <div>
              <dt>Profile</dt>
              <dd>
                <Link to={`/account/${accountId}/profile`} className="settings-inline-link">
                  Edit profile & role →
                </Link>
              </dd>
            </div>
          </dl>
        </section>

        <section className="settings-card settings-card--accent">
          <h2 className="settings-card-title">E-sign (built-in)</h2>
          <p className="settings-card-body">
            Send offer letters and agreements when someone moves on the pipeline — candidates sign in your app, no
            external provider. Run <code style={{ fontSize: 12 }}>python manage.py db seed</code> for sample templates.
          </p>
          <Link to={`/account/${accountId}/settings/esign`} className="btn-primary settings-card-cta">
            Open E-sign setup
          </Link>
        </section>
      </div>
    </div>
  )
}
