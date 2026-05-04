import { useEffect, useMemo, useState } from 'react'
import {
  candidatePortalApi,
  type CandidatePortalApplication,
  type CandidatePortalProfile,
} from '../api/candidatePortal'
import NiyamLogo from '../components/NiyamLogo'
import './CandidatePortalPage.css'

type Mode = 'login' | 'register'
type Tab = 'applications' | 'profile'

const STATUS_LABELS: Record<string, string> = {
  applied: 'Applied',
  screening: 'Under Review',
  interview: 'Interview',
  offer: 'Offered',
  hired: 'Hired',
  rejected: 'Not Selected',
  withdrawn: 'Withdrawn',
}

function prettyStatus(status: string) {
  return STATUS_LABELS[status] || status.replace(/_/g, ' ')
}

const LS_ACCESS_TOKEN = 'candidate_portal_access_token'

export default function CandidatePortalPage() {
  const [mode, setMode] = useState<Mode>('login')
  const [tab, setTab] = useState<Tab>('applications')
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [savingProfile, setSavingProfile] = useState(false)
  const [submittingAuth, setSubmittingAuth] = useState(false)
  const [error, setError] = useState('')
  const [profile, setProfile] = useState<CandidatePortalProfile | null>(null)
  const [apps, setApps] = useState<CandidatePortalApplication[]>([])
  const [authEmail, setAuthEmail] = useState('')
  const [authPassword, setAuthPassword] = useState('')
  const [registerName, setRegisterName] = useState('')

  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [location, setLocation] = useState('')
  const [headline, setHeadline] = useState('')
  const [summary, setSummary] = useState('')
  const [linkedinUrl, setLinkedinUrl] = useState('')
  const [portfolioUrl, setPortfolioUrl] = useState('')
  const [resumeUrl, setResumeUrl] = useState('')

  useEffect(() => {
    const saved = localStorage.getItem(LS_ACCESS_TOKEN)?.trim()
    if (!saved) {
      setLoading(false)
      return
    }
    setAccessToken(saved)
  }, [])

  useEffect(() => {
    if (!accessToken) return
    let cancelled = false
    setLoading(true)
    Promise.all([candidatePortalApi.me(accessToken), candidatePortalApi.myApplications(accessToken)])
      .then(([me, rows]) => {
        if (cancelled) return
        setProfile(me)
        setApps(rows)
        setFullName(me.full_name || '')
        setPhone(me.phone || '')
        setLocation(me.location || '')
        setHeadline(me.headline || '')
        setSummary(me.summary || '')
        setLinkedinUrl(me.linkedin_url || '')
        setPortfolioUrl(me.portfolio_url || '')
        setResumeUrl(me.resume_url || '')
      })
      .catch(e => {
        if (cancelled) return
        setError(e instanceof Error ? e.message : 'Could not load candidate portal')
        localStorage.removeItem(LS_ACCESS_TOKEN)
        setAccessToken(null)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [accessToken])

  const timelinePreview = useMemo(
    () =>
      apps.map(row => {
        const hist = Array.isArray(row.stage_history) ? row.stage_history : []
        const latest = hist[hist.length - 1]
        return { id: row.id, stage: latest?.stage || row.status, changedAt: latest?.changed_at || row.updated_at }
      }),
    [apps],
  )

  const authenticate = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmittingAuth(true)
    setError('')
    try {
      const payload =
        mode === 'register'
          ? await candidatePortalApi.register({
              email: authEmail.trim(),
              password: authPassword,
              full_name: registerName.trim() || undefined,
            })
          : await candidatePortalApi.login({
              email: authEmail.trim(),
              password: authPassword,
            })
      setAccessToken(payload.access_token)
      localStorage.setItem(LS_ACCESS_TOKEN, payload.access_token)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Authentication failed')
    } finally {
      setSubmittingAuth(false)
    }
  }

  const saveProfile = async () => {
    if (!accessToken) return
    setSavingProfile(true)
    setError('')
    try {
      const next = await candidatePortalApi.updateMe(accessToken, {
        full_name: fullName,
        phone,
        location,
        headline,
        summary,
        linkedin_url: linkedinUrl,
        portfolio_url: portfolioUrl,
        resume_url: resumeUrl,
      })
      setProfile(next)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save profile')
    } finally {
      setSavingProfile(false)
    }
  }

  const uploadPhoto = async (file: File | null) => {
    if (!accessToken || !file) return
    try {
      const out = await candidatePortalApi.uploadPhoto(accessToken, file)
      setProfile(out.profile)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Photo upload failed')
    }
  }

  const uploadResume = async (file: File | null) => {
    if (!accessToken || !file) return
    try {
      const out = await candidatePortalApi.uploadResume(accessToken, file)
      setProfile(out.profile)
      setResumeUrl(out.profile.resume_url || '')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Resume upload failed')
    }
  }

  const logout = () => {
    localStorage.removeItem(LS_ACCESS_TOKEN)
    setAccessToken(null)
    setProfile(null)
    setApps([])
  }

  if (loading) {
    return (
      <div className="candidate-portal-page candidate-portal-page--auth">
        <div className="candidate-portal-loading candidate-portal-loading--branded" aria-busy="true">
          <span className="candidate-portal-spinner" />
        </div>
      </div>
    )
  }

  if (!accessToken || !profile) {
    return (
      <div className="candidate-portal-page candidate-portal-page--auth">
        <div className="candidate-portal-auth-shell">
          <div className="candidate-portal-auth-card">
            <div className="candidate-portal-auth-brand">
              <NiyamLogo width={36} height={36} alt="" />
              <span className="candidate-portal-auth-brand-text">Niyam</span>
            </div>
            <div className="candidate-portal-auth-head">
              <h1 className="candidate-portal-auth-title">{mode === 'login' ? 'Sign in' : 'Create account'}</h1>
              <p className="candidate-portal-auth-sub">
                {mode === 'login'
                  ? 'Access your applications and profile.'
                  : 'If you already applied, use that email—we will pull in your application details. You can also create an account first and apply later.'}
              </p>
            </div>
            <div className="candidate-portal-segment" role="tablist" aria-label="Account mode">
              <button
                type="button"
                role="tab"
                aria-selected={mode === 'login'}
                className={mode === 'login' ? 'is-active' : ''}
                onClick={() => {
                  setMode('login')
                  setError('')
                }}
              >
                Sign in
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={mode === 'register'}
                className={mode === 'register' ? 'is-active' : ''}
                onClick={() => {
                  setMode('register')
                  setError('')
                }}
              >
                Create account
              </button>
            </div>
            {error && <div className="candidate-portal-alert">{error}</div>}
            <form className="candidate-portal-auth-form" onSubmit={authenticate}>
              {mode === 'register' && (
                <label className="candidate-portal-field">
                  <span className="candidate-portal-field-label">Full name</span>
                  <input value={registerName} onChange={e => setRegisterName(e.target.value)} autoComplete="name" />
                </label>
              )}
              <label className="candidate-portal-field">
                <span className="candidate-portal-field-label">Email</span>
                <input type="email" required value={authEmail} onChange={e => setAuthEmail(e.target.value)} autoComplete="email" />
              </label>
              <label className="candidate-portal-field">
                <span className="candidate-portal-field-label">Password</span>
                <input
                  type="password"
                  minLength={8}
                  required
                  value={authPassword}
                  onChange={e => setAuthPassword(e.target.value)}
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                />
              </label>
              <button type="submit" className="candidate-portal-submit" disabled={submittingAuth}>
                {submittingAuth ? 'Working…' : mode === 'register' ? 'Create account' : 'Sign in'}
              </button>
            </form>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="candidate-portal-page candidate-portal-page--app">
      <div className="candidate-portal-shell">
        <header className="candidate-portal-header">
          <div>
            <h1>Welcome, {profile.full_name || profile.email}</h1>
            <p>Track your job progress and keep your profile up to date.</p>
          </div>
          <button type="button" className="candidate-portal-logout" onClick={logout}>
            Logout
          </button>
        </header>
        {error && <p className="candidate-portal-error">{error}</p>}
        <div className="candidate-portal-tabs">
          <button type="button" className={tab === 'applications' ? 'is-active' : ''} onClick={() => setTab('applications')}>
            My applications
          </button>
          <button type="button" className={tab === 'profile' ? 'is-active' : ''} onClick={() => setTab('profile')}>
            My profile
          </button>
        </div>

        {tab === 'applications' ? (
          <section className="candidate-portal-apps">
            {apps.length === 0 ? (
              <div className="candidate-portal-card">No applications found for this candidate account yet.</div>
            ) : (
              apps.map(app => (
                <article key={app.id} className="candidate-portal-card">
                  <div className="candidate-portal-app-row">
                    <h3>{app.job.title}</h3>
                    <span className={`candidate-portal-status status-${app.status}`}>{prettyStatus(app.status)}</span>
                  </div>
                  <p className="candidate-portal-meta">Applied on {new Date(app.created_at).toLocaleDateString()}</p>
                  <div className="candidate-portal-timeline">
                    {Array.isArray(app.stage_history) && app.stage_history.length > 0 ? (
                      app.stage_history.slice(-4).map((step, idx) => (
                        <div key={`${app.id}-${idx}`} className="candidate-portal-timeline-item">
                          <strong>{prettyStatus(step.stage || app.status)}</strong>
                          <span>{step.changed_at ? new Date(step.changed_at).toLocaleString() : 'Recently updated'}</span>
                        </div>
                      ))
                    ) : (
                      <div className="candidate-portal-timeline-item">
                        <strong>{prettyStatus(app.status)}</strong>
                        <span>{new Date(app.updated_at).toLocaleString()}</span>
                      </div>
                    )}
                  </div>
                </article>
              ))
            )}
            {timelinePreview.length > 0 && (
              <div className="candidate-portal-card">
                <h3>Latest status summary</h3>
                <ul className="candidate-portal-summary-list">
                  {timelinePreview.map(row => (
                    <li key={row.id}>
                      <span>Application #{row.id}</span>
                      <strong>{prettyStatus(row.stage)}</strong>
                      <em>{new Date(row.changedAt).toLocaleDateString()}</em>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        ) : (
          <section className="candidate-portal-profile">
            <div className="candidate-portal-card">
              <h3>Profile photo</h3>
              <div className="candidate-portal-upload-row">
                {profile.profile_picture_url ? <img src={profile.profile_picture_url} alt="Profile" className="candidate-portal-avatar" /> : <div className="candidate-portal-avatar candidate-portal-avatar--empty">No photo</div>}
                <input type="file" accept="image/*" onChange={e => void uploadPhoto(e.target.files?.[0] ?? null)} />
              </div>
            </div>
            <div className="candidate-portal-card">
              <h3>Resume</h3>
              <div className="candidate-portal-upload-row">
                <input type="file" accept=".pdf,.doc,.docx" onChange={e => void uploadResume(e.target.files?.[0] ?? null)} />
                {profile.resume_url && (
                  <a href={profile.resume_url} target="_blank" rel="noreferrer">
                    View current resume
                  </a>
                )}
              </div>
            </div>
            <div className="candidate-portal-card candidate-portal-form-grid">
              <h3>Profile details</h3>
              <label>Full name<input value={fullName} onChange={e => setFullName(e.target.value)} /></label>
              <label>Phone<input value={phone} onChange={e => setPhone(e.target.value)} /></label>
              <label>Location<input value={location} onChange={e => setLocation(e.target.value)} /></label>
              <label>Professional headline<input value={headline} onChange={e => setHeadline(e.target.value)} /></label>
              <label>LinkedIn URL<input value={linkedinUrl} onChange={e => setLinkedinUrl(e.target.value)} /></label>
              <label>Portfolio URL<input value={portfolioUrl} onChange={e => setPortfolioUrl(e.target.value)} /></label>
              <label>Resume URL<input value={resumeUrl} onChange={e => setResumeUrl(e.target.value)} /></label>
              <label className="candidate-portal-form-full">Summary<textarea value={summary} rows={5} onChange={e => setSummary(e.target.value)} /></label>
              <button type="button" disabled={savingProfile} onClick={() => void saveProfile()}>
                {savingProfile ? 'Saving…' : 'Save profile'}
              </button>
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
