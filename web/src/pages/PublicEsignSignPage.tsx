import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { publicGetSignPage, publicSubmitSign } from '../api/esign'
import NiyamLogo from '../components/NiyamLogo'
import { SignaturePad, type SignaturePadHandle } from '../components/SignaturePad'
import '../App.css'

const API_BASE = '/api/v1'

function signedDownloadHref(token: string) {
  return `${API_BASE}/public/esign/sign/${encodeURIComponent(token)}/download`
}

export default function PublicEsignSignPage() {
  const { token } = useParams<{ token: string }>()
  const sigRef = useRef<SignaturePadHandle>(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)
  const [page, setPage] = useState<Awaited<ReturnType<typeof publicGetSignPage>> | null>(null)
  const [legalName, setLegalName] = useState('')
  const [agreed, setAgreed] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!token) {
      setErr('Invalid link')
      setLoading(false)
      return
    }
    publicGetSignPage(token)
      .then(setPage)
      .catch(e => setErr(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => setLoading(false))
  }, [token])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!token) return
    if (sigRef.current?.isEmpty()) {
      setErr('Please draw your signature in the box.')
      return
    }
    const png = sigRef.current?.toDataURL() ?? ''
    setSubmitting(true)
    setErr(null)
    try {
      await publicSubmitSign(token, legalName, agreed, png)
      const refreshed = await publicGetSignPage(token)
      setPage(refreshed)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Sign failed')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="public-sign-loading">
        <div className="public-sign-loading-card">
          <div className="spinner" style={{ width: 36, height: 36 }} aria-label="Loading" />
          <p>Loading document…</p>
        </div>
      </div>
    )
  }

  if (err && !page) {
    return (
      <div className="public-sign-loading">
        <div className="public-sign-error-card">
          <h1>Unable to open</h1>
          <p>{err}</p>
        </div>
      </div>
    )
  }

  if (!page) return null

  const done = page.already_signed || page.status === 'signed'
  const showDownload = done && page.signed_copy_available

  return (
    <div className="public-sign-app">
      <header className="public-sign-bar">
        <div className="public-sign-bar-inner">
          <span className="public-sign-brand">
            <NiyamLogo className="public-sign-brand-mark" width={22} height={22} alt="" />
            Secure signing
          </span>
          {page.template_name && <span className="public-sign-doc-label">{page.template_name}</span>}
        </div>
      </header>

      <main className="public-sign-main">
        <div className="public-sign-intro">
          <h1 className="public-sign-title">Please review and sign</h1>
          <p className="public-sign-sub">
            {page.candidate_display_name ? (
              <>
                Prepared for <strong>{page.candidate_display_name}</strong>
              </>
            ) : (
              'Review the agreement below, then sign with your mouse or finger.'
            )}
          </p>
        </div>

        {err && <div className="public-sign-alert">{err}</div>}

        <div className="public-sign-sheet">
          <div className="public-sign-sheet-rail" aria-hidden />
          <div className="public-sign-sheet-body">
            <article
              className="public-sign-doc-html"
              dangerouslySetInnerHTML={{ __html: page.html || '<p>(No content)</p>' }}
            />
          </div>
        </div>

        {done ? (
          <section className="public-sign-complete">
            <div className="public-sign-complete-icon" aria-hidden>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <h2 className="public-sign-complete-title">You&apos;re all set</h2>
            <p className="public-sign-complete-text">
              This document was signed
              {page.signed_at ? <> on {new Date(page.signed_at).toLocaleString()}</> : ''}.
              {page.signer_legal_name && (
                <>
                  <br />
                  Signer: <strong>{page.signer_legal_name}</strong>
                </>
              )}
            </p>
            {showDownload && token && (
              <a className="btn-public-sign-primary" href={signedDownloadHref(token)} download>
                Download signed PDF
              </a>
            )}
            {!showDownload && (
              <p className="public-sign-muted">A downloadable copy is not on file for this older signature.</p>
            )}
          </section>
        ) : (
          <form className="public-sign-form" onSubmit={onSubmit}>
            <div className="public-sign-form-card">
              <h2 className="public-sign-form-title">Sign here</h2>
              <p className="public-sign-form-hint">Draw your signature — same as ink on paper.</p>
              <SignaturePad ref={sigRef} className="public-sign-sig" height={180} />
              <div className="public-sign-sig-actions">
                <button type="button" className="btn-public-sign-ghost" onClick={() => sigRef.current?.clear()}>
                  Clear signature
                </button>
              </div>

              <label className="public-sign-field">
                <span className="public-sign-field-label">Full legal name</span>
                <input
                  type="text"
                  autoComplete="name"
                  value={legalName}
                  onChange={e => setLegalName(e.target.value)}
                  required
                  placeholder="As shown on your ID"
                />
              </label>

              <label className="public-sign-check">
                <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)} required />
                <span>I have read this document and agree to sign it electronically.</span>
              </label>

              <button type="submit" className="btn-public-sign-primary public-sign-submit" disabled={submitting}>
                {submitting ? 'Signing…' : 'Finish signing'}
              </button>
            </div>
          </form>
        )}
      </main>

      <footer className="public-sign-footer">
        Electronic records are stored securely by your employer. Questions? Contact the hiring team.
      </footer>
    </div>
  )
}
