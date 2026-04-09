import { Link, useParams } from 'react-router-dom'

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
          <span className="comm-channels-hub-card-icon" aria-hidden>
            <svg width={40} height={40} viewBox="0 0 24 24" fill="none">
              <path
                d="M4 6h16v12H4V6zm2 2v8h12V8H6zm2 2h8v2H8v-2zm0 3h5v2H8v-2z"
                fill="currentColor"
                opacity={0.9}
              />
              <path d="M2 4h20v2H2V4zm0 14h20v2H2v-2z" fill="currentColor" opacity={0.35} />
            </svg>
          </span>
          <span className="comm-channels-hub-card-title">Email</span>
          <span className="comm-channels-hub-card-desc">
            Gmail (OAuth), Outlook, or custom SMTP / IMAP — full-screen setup
          </span>
          <span className="comm-channels-hub-card-cta">Configure →</span>
        </Link>

        <div className="comm-channels-hub-card comm-channels-hub-card--soon" aria-disabled>
          <span className="comm-channels-hub-card-icon comm-channels-hub-card-icon--muted" aria-hidden>
            <svg width={40} height={40} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.4}>
              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
            </svg>
          </span>
          <span className="comm-channels-hub-card-title">More channels</span>
          <span className="comm-channels-hub-card-desc">Slack, SMS, webhooks — coming later</span>
          <span className="comm-channels-hub-card-badge">Soon</span>
        </div>
      </div>
    </div>
  )
}
