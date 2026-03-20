import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { publicApplyApi, type PublicJobApplyPayload } from '../api/publicApply'
import './PublicJobApplyPage.css'

function formatSalary(s: PublicJobApplyPayload['salary']) {
  if (!s) return null
  const cur = s.currency || 'USD'
  if (s.min != null && s.max != null) return `${cur} ${s.min.toLocaleString()} – ${s.max.toLocaleString()}`
  if (s.min != null) return `${cur} ${s.min.toLocaleString()}+`
  if (s.max != null) return `Up to ${cur} ${s.max.toLocaleString()}`
  return null
}

export default function PublicJobApplyPage() {
  const { token } = useParams<{ token: string }>()
  const [job, setJob] = useState<PublicJobApplyPayload | null>(null)
  const [loadErr, setLoadErr] = useState('')
  const [submitErr, setSubmitErr] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  const [candidate_name, setCandidateName] = useState('')
  const [candidate_email, setCandidateEmail] = useState('')
  const [candidate_phone, setCandidatePhone] = useState('')
  const [candidate_location, setCandidateLocation] = useState('')
  const [resume_url, setResumeUrl] = useState('')
  const [cover_letter, setCoverLetter] = useState('')
  const [linkedin_url, setLinkedinUrl] = useState('')
  const [portfolio_url, setPortfolioUrl] = useState('')

  useEffect(() => {
    if (!token) {
      setLoadErr('Invalid link.')
      return
    }
    let cancelled = false
    publicApplyApi
      .getJob(token)
      .then(data => {
        if (!cancelled) setJob(data)
      })
      .catch(e => {
        if (!cancelled) setLoadErr(e instanceof Error ? e.message : 'This job is not available.')
      })
    return () => {
      cancelled = true
    }
  }, [token])

  const fields = job?.application_fields ?? {
    resume: true,
    cover_letter: true,
    portfolio: false,
    linkedin: false,
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token || !job) return
    setSubmitErr('')
    if (!candidate_email.trim()) {
      setSubmitErr('Email is required.')
      return
    }
    setSubmitting(true)
    try {
      await publicApplyApi.submit(token, {
        candidate_name: candidate_name.trim() || undefined,
        candidate_email: candidate_email.trim(),
        candidate_phone: candidate_phone.trim() || undefined,
        candidate_location: candidate_location.trim() || undefined,
        resume_url: fields.resume ? resume_url.trim() || undefined : undefined,
        cover_letter: fields.cover_letter ? cover_letter.trim() || undefined : undefined,
        linkedin_url: fields.linkedin ? linkedin_url.trim() || undefined : undefined,
        portfolio_url: fields.portfolio ? portfolio_url.trim() || undefined : undefined,
      })
      setDone(true)
    } catch (err: unknown) {
      setSubmitErr(err instanceof Error ? err.message : 'Submission failed.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loadErr) {
    return (
      <div className="public-apply-page">
        <header className="public-apply-header">
          <span className="public-apply-brand">ForgeAPI</span>
          <Link to="/login" className="public-apply-header-link">
            Recruiter sign in
          </Link>
        </header>
        <main className="public-apply-main public-apply-main--narrow">
          <div className="public-apply-card">
            <h1 className="public-apply-title">Job not available</h1>
            <p className="public-apply-muted">{loadErr}</p>
          </div>
        </main>
      </div>
    )
  }

  if (!job) {
    return (
      <div className="public-apply-page">
        <div className="public-apply-loading">Loading…</div>
      </div>
    )
  }

  if (done) {
    return (
      <div className="public-apply-page">
        <header className="public-apply-header">
          <span className="public-apply-brand">ForgeAPI</span>
        </header>
        <main className="public-apply-main public-apply-main--narrow">
          <div className="public-apply-card public-apply-success">
            <h1 className="public-apply-title">Application sent</h1>
            <p className="public-apply-muted">
              Thank you{job.company_name ? ` for applying to ${job.company_name}` : ''}. The hiring team has your
              details and may follow up by email.
            </p>
          </div>
        </main>
      </div>
    )
  }

  const salaryLine = formatSalary(job.salary)

  return (
    <div className="public-apply-page">
      <header className="public-apply-header">
        <span className="public-apply-brand">ForgeAPI</span>
        <Link to="/login" className="public-apply-header-link">
          Recruiter sign in
        </Link>
      </header>

      <main className="public-apply-main">
        <article className="public-apply-card public-apply-job">
          <p className="public-apply-company">{job.company_name || 'Hiring company'}</p>
          <h1 className="public-apply-title">{job.title}</h1>
          <ul className="public-apply-meta">
            {job.department && <li>{job.department}</li>}
            {job.location && <li>{job.location}</li>}
            <li>{job.location_type}</li>
            <li>{job.employment_type.replace(/_/g, ' ')}</li>
            {job.experience_level && <li>{job.experience_level.replace(/-/g, '–')} yrs</li>}
            {job.open_positions > 1 && <li>{job.open_positions} openings</li>}
            {salaryLine && <li className="public-apply-meta-salary">{salaryLine}</li>}
          </ul>
          {job.skills_required.length > 0 && (
            <div className="public-apply-skills">
              <span className="public-apply-skills-label">Required</span>
              <div className="public-apply-tags">
                {job.skills_required.map(s => (
                  <span key={s} className="public-apply-tag public-apply-tag-req">
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}
          {job.skills_nice.length > 0 && (
            <div className="public-apply-skills">
              <span className="public-apply-skills-label">Nice to have</span>
              <div className="public-apply-tags">
                {job.skills_nice.map(s => (
                  <span key={s} className="public-apply-tag">
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}
          {job.bonus_incentives && (
            <p className="public-apply-bonus">
              <strong>Bonus / incentives:</strong> {job.bonus_incentives}
            </p>
          )}
          <div
            className="public-apply-description rte-content"
            dangerouslySetInnerHTML={{ __html: job.description_html }}
          />
        </article>

        <section className="public-apply-card public-apply-form-card">
          <h2 className="public-apply-form-title">Apply</h2>
          <p className="public-apply-muted">Your information is sent only to this employer’s workspace.</p>
          {submitErr && <div className="auth-error public-apply-error">{submitErr}</div>}
          <form className="public-apply-form" onSubmit={submit}>
            <label className="public-apply-field">
              <span>Full name</span>
              <input value={candidate_name} onChange={e => setCandidateName(e.target.value)} autoComplete="name" />
            </label>
            <label className="public-apply-field">
              <span>Email *</span>
              <input
                type="email"
                required
                value={candidate_email}
                onChange={e => setCandidateEmail(e.target.value)}
                autoComplete="email"
              />
            </label>
            <label className="public-apply-field">
              <span>Phone</span>
              <input value={candidate_phone} onChange={e => setCandidatePhone(e.target.value)} autoComplete="tel" />
            </label>
            <label className="public-apply-field">
              <span>Your location</span>
              <input
                value={candidate_location}
                onChange={e => setCandidateLocation(e.target.value)}
                placeholder="City, country"
              />
            </label>
            {fields.resume && (
              <label className="public-apply-field">
                <span>Resume link (URL)</span>
                <input
                  type="url"
                  value={resume_url}
                  onChange={e => setResumeUrl(e.target.value)}
                  placeholder="https://…"
                />
              </label>
            )}
            {fields.linkedin && (
              <label className="public-apply-field">
                <span>LinkedIn</span>
                <input type="url" value={linkedin_url} onChange={e => setLinkedinUrl(e.target.value)} />
              </label>
            )}
            {fields.portfolio && (
              <label className="public-apply-field">
                <span>Portfolio</span>
                <input type="url" value={portfolio_url} onChange={e => setPortfolioUrl(e.target.value)} />
              </label>
            )}
            {fields.cover_letter && (
              <label className="public-apply-field">
                <span>Cover letter</span>
                <textarea value={cover_letter} onChange={e => setCoverLetter(e.target.value)} rows={5} />
              </label>
            )}
            <button type="submit" className="public-apply-submit" disabled={submitting}>
              {submitting ? 'Submitting…' : 'Submit application'}
            </button>
          </form>
        </section>
      </main>
    </div>
  )
}
