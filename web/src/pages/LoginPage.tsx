import { useState } from 'react'
import type { FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useToast } from '../contexts/ToastContext'
import { useAuth } from '../auth/AuthContext'
import { Hero3D, Icon, Icon3D } from '../icons'

const HIGHLIGHTS = [
  { icon: 'pipeline', text: 'Structured pipelines with drag-and-drop stages' },
  { icon: 'interviews', text: 'Scorecards, interview kits and feedback in one place' },
  { icon: 'signature', text: 'Offers out the door with built-in e-signature' },
] as const

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const toast = useToast()
  const { signIn, loading, error, user } = useAuth()
  const navigate = useNavigate()

  if (user?.account) {
    return <Navigate to={`/account/${user.account.id}/profile`} replace />
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const u = await signIn(email, password)
    if (u?.account) {
      toast.success('Welcome back!', 'You have been signed in successfully.')
      navigate(`/account/${u.account.id}/profile`, { replace: true })
    } else if (u) {
      toast.error(
        'No workspace linked',
        'This user is not a member of any account. Ask an admin to invite you.',
      )
    }
  }

  return (
    <div className="auth-page">
      <section className="auth-showcase" aria-hidden>
        <div className="auth-showcase-brand">
          <Icon3D name="brand" size={40} />
          <span className="auth-showcase-name">Niyam</span>
        </div>

        <Hero3D
          className="auth-showcase-scene"
          centerScale={1.35}
          satellites={[
            { name: 'jobs', position: [-0.78, 0.62, -0.4], scale: 0.55 },
            { name: 'candidates', position: [0.8, 0.7, -0.6], scale: 0.55 },
            { name: 'interviews', position: [-0.74, -0.6, 0.2], scale: 0.5 },
            { name: 'trophy', position: [0.76, -0.56, 0.1], scale: 0.52 },
          ]}
        />

        <div className="auth-showcase-copy">
          <h2>Hire with structure, not spreadsheets.</h2>
          <ul className="auth-highlights">
            {HIGHLIGHTS.map(h => (
              <li key={h.icon}>
                <span className="auth-highlight-icon">
                  <Icon name={h.icon} size={16} />
                </span>
                {h.text}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="auth-panel">
        <div className="auth-card">
          <div className="auth-card-head">
            <Icon3D name="brand" size={56} className="auth-card-logo" />
            <h1>Welcome back</h1>
            <p>Sign in to your Niyam workspace</p>
          </div>

          <form onSubmit={handleSubmit} noValidate className="auth-form">
            <div className="field">
              <label htmlFor="email">Work email</label>
              <div className="field-control">
                <Icon name="mail" size={16} className="field-icon" />
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  placeholder="you@company.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  disabled={loading}
                />
              </div>
            </div>

            <div className="field">
              <label htmlFor="password">Password</label>
              <div className="field-control">
                <Icon name="lock" size={16} className="field-icon" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  placeholder="Enter your password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  disabled={loading}
                />
                <button
                  type="button"
                  className="field-adornment-btn"
                  onClick={() => setShowPassword(v => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  <Icon name="eye" size={16} />
                </button>
              </div>
            </div>

            {error && (
              <div className="auth-error" role="alert">
                <Icon name="alert" size={15} />
                {error}
              </div>
            )}

            <button type="submit" className="btn-primary auth-submit" disabled={loading || !email || !password}>
              {loading ? (
                <>
                  <span className="btn-spinner" aria-hidden /> Signing in…
                </>
              ) : (
                <>
                  Sign in <Icon name="arrowRight" size={16} strokeWidth={2} />
                </>
              )}
            </button>
          </form>

          <div className="auth-hint">
            <Icon name="sparkle" size={14} />
            Demo account: <code>admin@example.com</code> / <code>password123</code>
          </div>
        </div>
        <p className="auth-legal">© {new Date().getFullYear()} Niyam · Hiring OS</p>
      </section>
    </div>
  )
}
