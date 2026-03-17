import { useState } from 'react'
import type { FormEvent } from 'react'

interface Props {
  onLogin: (email: string, password: string) => Promise<boolean>
  loading: boolean
  error: string | null
}

function BrandIcon() {
  return (
    <div className="auth-brand-icon">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path d="M3 13L8 3L13 13H10L8 9L6 13H3Z" fill="white" />
      </svg>
    </div>
  )
}

export default function LoginPage({ onLogin, loading, error }: Props) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    await onLogin(email, password)
  }

  return (
    <div className="auth-page">
      <nav className="auth-topbar">
        <div className="auth-brand">
          <BrandIcon />
          ForgeAPI
        </div>
      </nav>

      <div className="auth-body">
        <div className="auth-card">
          <div className="auth-card-header">
            <h1>Sign in to ForgeAPI</h1>
            <p>Enter your credentials to access your workspace</p>
          </div>

          <div className="auth-card-body">
            <form onSubmit={handleSubmit} noValidate>
              <div className="field">
                <label htmlFor="email">Email address</label>
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

              <div className="field">
                <label htmlFor="password">Password</label>
                <input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  disabled={loading}
                />
              </div>

              {error && (
                <div className="auth-error" role="alert">
                  <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
                    <circle cx="6.5" cy="6.5" r="6" stroke="currentColor" strokeWidth="1.2" />
                    <path d="M6.5 4v3M6.5 9v.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                  </svg>
                  {error}
                </div>
              )}

              <button
                type="submit"
                className="btn-primary"
                disabled={loading || !email || !password}
              >
                {loading ? 'Signing in…' : 'Sign in'}
              </button>
            </form>

            <div className="auth-hint">
              Demo account: <code>admin@example.com</code> / <code>password123</code>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
