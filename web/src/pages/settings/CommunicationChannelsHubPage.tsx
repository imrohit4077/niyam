import { Link, useParams } from 'react-router-dom'
import { Icon, Icon3D } from '../../icons'

/**
 * Hub: one card per channel family. Email opens full-screen setup (OAuth + manual).
 */
export default function CommunicationChannelsHubPage() {
  const { accountId } = useParams<{ accountId: string }>()
  const base = `/account/${accountId}/settings/communication-channels`

  return (
    <div className="comm-channels-hub">
      <header className="comm-channels-hub-head">
        <h2 className="settings-org-title">Communication channels</h2>
        <p className="settings-lead settings-lead--tight">
          Connect email, and later other providers, for outbound messages and sync. Open Email to connect Gmail with
          Google sign-in or add SMTP manually.
        </p>
      </header>

      <div className="comm-channels-hub-grid">
        <Link to={`${base}/email`} className="comm-channels-hub-card">
          <Icon3D name="mail" size={64} tile className="comm-channels-hub-card-3d" />
          <span className="comm-channels-hub-card-title">Email</span>
          <span className="comm-channels-hub-card-desc">
            Gmail (OAuth), Outlook, or custom SMTP / IMAP — full-screen setup
          </span>
          <span className="comm-channels-hub-card-cta">
            Configure <Icon name="arrowRight" size={14} />
          </span>
        </Link>

        <div className="comm-channels-hub-card comm-channels-hub-card--soon" aria-disabled>
          <Icon3D name="link" size={64} tile className="comm-channels-hub-card-3d" />
          <span className="comm-channels-hub-card-title">More channels</span>
          <span className="comm-channels-hub-card-desc">Slack, SMS, webhooks — coming later</span>
          <span className="comm-channels-hub-card-badge">Soon</span>
        </div>
      </div>
    </div>
  )
}
