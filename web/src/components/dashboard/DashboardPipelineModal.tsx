import { Link } from 'react-router-dom'
import type { Application } from '../../api/applications'
import type { Job } from '../../api/jobs'
import type { InterviewAssignmentRow } from '../../api/interviews'
import { STAGE_COLORS } from './dashboardConstants'
import { formatDashboardLabel, formatDateTimeShort } from './dashboardUtils'

export type PipelineModalKind = 'applicants' | 'interviews' | 'offers' | 'hired'

function LoadingRow() {
  return (
    <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
      <div className="spinner" style={{ margin: '0 auto 8px', width: 24, height: 24 }} />
      Loading...
    </div>
  )
}

function ErrorRow({ msg }: { msg: string }) {
  return (
    <div
      style={{
        padding: '16px 20px',
        color: 'var(--error)',
        fontSize: 13,
        background: 'var(--error-bg)',
        borderBottom: '1px solid var(--error-border)',
      }}
    >
      {msg}
    </div>
  )
}

export function DashboardPipelineModal({
  active,
  onClose,
  selectedJob,
  accountId,
  interviewPanelRows,
  interviewsLoading,
  interviewsError,
  jobApplications,
  offerRows,
  hiredRows,
}: {
  active: PipelineModalKind | null
  onClose: () => void
  selectedJob: Job | null
  accountId: string
  interviewPanelRows: InterviewAssignmentRow[]
  interviewsLoading: boolean
  interviewsError: string
  jobApplications: Application[]
  offerRows: Application[]
  hiredRows: Application[]
}) {
  if (!active) return null

  const modalTitle =
    active === 'applicants'
      ? 'Applicants'
      : active === 'interviews'
        ? 'Interviews'
        : active === 'offers'
          ? 'Offers'
          : 'Hired candidates'

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal dashboard-interviews-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">{modalTitle}</span>
          <button className="modal-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <div className="modal-body dashboard-interviews-modal-body">
          <p className="dashboard-modal-lead">
            {selectedJob ? `${modalTitle} for ${selectedJob.title}` : modalTitle}
          </p>
          {active === 'interviews' ? (
            interviewsLoading ? (
              <LoadingRow />
            ) : interviewsError ? (
              <ErrorRow msg={interviewsError} />
            ) : interviewPanelRows.length === 0 ? (
              <div className="dashboard-empty">No interview records for this job.</div>
            ) : (
              <div className="dashboard-schedule">
                {interviewPanelRows.map(row => (
                  <div key={row.id} className="dashboard-schedule-item">
                    <div>
                      <strong>{row.application?.candidate_name || row.application?.candidate_email || 'Candidate'}</strong>
                      <span>{row.job?.title ?? `Job #${row.application?.job_id ?? '—'}`}</span>
                    </div>
                    <div className="dashboard-schedule-meta">
                      <span className={`tag ${STAGE_COLORS[row.status] ?? 'tag-blue'}`}>{formatDashboardLabel(row.status)}</span>
                      <span>{formatDateTimeShort(row.scheduled_at)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : active === 'applicants' ? (
            jobApplications.length === 0 ? (
              <div className="dashboard-empty">No applicants for this job.</div>
            ) : (
              <div className="dashboard-schedule">
                {jobApplications.map(application => (
                  <div key={application.id} className="dashboard-schedule-item">
                    <div>
                      <strong>{application.candidate_name || application.candidate_email}</strong>
                      <span>{application.candidate_email}</span>
                    </div>
                    <div className="dashboard-schedule-meta">
                      <span className={`tag ${STAGE_COLORS[application.status] ?? 'tag-blue'}`}>
                        {formatDashboardLabel(application.status)}
                      </span>
                      <span>
                        {new Date(application.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : active === 'offers' ? (
            offerRows.length === 0 ? (
              <div className="dashboard-empty">No candidates in offer stage for this job.</div>
            ) : (
              <div className="dashboard-schedule">
                {offerRows.map(application => (
                  <div key={application.id} className="dashboard-schedule-item">
                    <div>
                      <strong>{application.candidate_name || application.candidate_email}</strong>
                      <span>{application.candidate_email}</span>
                    </div>
                    <div className="dashboard-schedule-meta">
                      <span className={`tag ${STAGE_COLORS[application.status] ?? 'tag-blue'}`}>
                        {formatDashboardLabel(application.status)}
                      </span>
                      <span>
                        {new Date(application.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : hiredRows.length === 0 ? (
            <div className="dashboard-empty">No hired candidates for this job.</div>
          ) : (
            <div className="dashboard-schedule">
              {hiredRows.map(application => (
                <div key={application.id} className="dashboard-schedule-item">
                  <div>
                    <strong>{application.candidate_name || application.candidate_email}</strong>
                    <span>{application.candidate_email}</span>
                  </div>
                  <div className="dashboard-schedule-meta">
                    <span className={`tag ${STAGE_COLORS[application.status] ?? 'tag-blue'}`}>
                      {formatDashboardLabel(application.status)}
                    </span>
                    <span>
                      {new Date(application.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
          {selectedJob ? (
            <div className="dashboard-modal-footer">
              <Link className="dashboard-link" to={`/account/${accountId}/jobs/${selectedJob.id}/edit`}>
                Open job
              </Link>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
