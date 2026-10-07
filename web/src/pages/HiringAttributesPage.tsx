import { useCallback, useEffect, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { Icon, Icon3D } from '../icons'
import type { DashboardOutletContext } from '../layouts/DashboardOutletContext'
import { hiringAttributesApi, type HiringAttributeRow } from '../api/hiringStructure'
import { can } from '../permissions'
import { useAuth } from '../auth/AuthContext'
import { useToast } from '../contexts/ToastContext'

function CalloutIconManage() {
  return <Icon name="shieldCheck" size={18} />
}

function CalloutIconReadonly() {
  return <Icon name="eye" size={18} />
}

function EmptyAttributesIcon() {
  return <Icon3D name="attributes" size={64} />
}

type AttributeModal =
  | null
  | { kind: 'create' }
  | { kind: 'edit'; row: HiringAttributeRow }
  | { kind: 'delete'; row: HiringAttributeRow }

export default function HiringAttributesPage() {
  const { token } = useOutletContext<DashboardOutletContext>()
  const { user } = useAuth()
  const toast = useToast()
  const canManage = can(user, 'hiring_structure', 'manage')

  const [rows, setRows] = useState<HiringAttributeRow[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<AttributeModal>(null)
  const [name, setName] = useState('')
  const [category, setCategory] = useState('')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setRows(await hiringAttributesApi.list(token))
    } catch (e: unknown) {
      toast.error('Load failed', e instanceof Error ? e.message : 'Failed')
    } finally {
      setLoading(false)
    }
  }, [token, toast])

  useEffect(() => {
    void load()
  }, [load])

  const closeModal = useCallback(() => {
    setModal(null)
    setName('')
    setCategory('')
    setDescription('')
    setSaving(false)
    setDeleting(false)
  }, [])

  const openCreate = () => {
    setName('')
    setCategory('')
    setDescription('')
    setModal({ kind: 'create' })
  }

  const openEdit = (row: HiringAttributeRow) => {
    setName(row.name)
    setCategory(row.category ?? '')
    setDescription(row.description ?? '')
    setModal({ kind: 'edit', row })
  }

  const openDelete = (row: HiringAttributeRow) => {
    setModal({ kind: 'delete', row })
  }

  const saveForm = async () => {
    if (!name.trim()) {
      toast.error('Validation', 'Name is required')
      return
    }
    if (!modal || modal.kind === 'delete') return
    setSaving(true)
    try {
      if (modal.kind === 'create') {
        await hiringAttributesApi.create(token, {
          name: name.trim(),
          category: category.trim() || undefined,
          description: description.trim() || undefined,
        })
        toast.success('Created', 'Attribute added.')
      } else {
        await hiringAttributesApi.update(token, modal.row.id, {
          name: name.trim(),
          category: category.trim() || null,
          description: description.trim() || null,
        })
        toast.success('Updated', 'Attribute saved.')
      }
      closeModal()
      void load()
    } catch (e: unknown) {
      toast.error('Save failed', e instanceof Error ? e.message : 'Failed')
    } finally {
      setSaving(false)
    }
  }

  const confirmDelete = async () => {
    if (!modal || modal.kind !== 'delete') return
    setDeleting(true)
    try {
      await hiringAttributesApi.destroy(token, modal.row.id)
      toast.success('Deleted', 'Attribute removed.')
      closeModal()
      void load()
    } catch (e: unknown) {
      toast.error('Delete failed', e instanceof Error ? e.message : 'Failed')
    } finally {
      setDeleting(false)
    }
  }

  useEffect(() => {
    if (!modal) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeModal()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [modal, closeModal])

  const isFormModal = modal?.kind === 'create' || modal?.kind === 'edit'
  const modalTitleId = 'ha-attr-modal-title'

  return (
    <div className="role-kickoff-page role-kickoff-page--form rk-sh-page">
      <header className="rk-sh-page-head">
        <Icon3D name="attributes" size={56} tile className="rk-sh-page-icon" />
        <div className="rk-sh-page-head-main">
          <p className="rk-sh-eyebrow">Structured hiring</p>
          <h1 className="rk-sh-title">Attributes</h1>
          <p className="rk-sh-lead">
            Scorecard dimensions used across stages and interviews—things like technical depth, communication, or
            ownership.
          </p>
        </div>
        {canManage ? (
          <div className="rk-sh-page-head-actions">
            <button type="button" className="rk-sh-btn rk-sh-btn-primary" onClick={openCreate}>
              Add attribute
            </button>
          </div>
        ) : null}
      </header>

      {canManage ? (
        <div className="rk-sh-callout rk-sh-callout--manage" role="status">
          <div className="rk-sh-callout__icon">
            <CalloutIconManage />
          </div>
          <div className="rk-sh-callout__body">
            <strong>You can manage attributes</strong>
            <span>Use Add attribute to create, or Edit / Delete on each row. Stages reference these on role kickoffs.</span>
          </div>
        </div>
      ) : (
        <div className="rk-sh-callout" role="status">
          <div className="rk-sh-callout__icon">
            <CalloutIconReadonly />
          </div>
          <div className="rk-sh-callout__body">
            <strong>View only</strong>
            <span>Only workspace admins, site admins, and hiring managers can add or change attributes.</span>
          </div>
        </div>
      )}

      <section className="rk-card rk-sh-card">
        <header className="rk-card-head rk-card-head--toolbar">
          <div>
            <h2 className="rk-card-title">Workspace attributes</h2>
            {canManage ? <p className="rk-card-desc">Dimensions available when configuring stages and kickoffs.</p> : null}
          </div>
          {canManage ? (
            <button type="button" className="rk-btn rk-btn-primary" onClick={openCreate}>
              Add attribute
            </button>
          ) : null}
        </header>
        <div className="rk-card-body" style={{ padding: 0 }}>
          {loading ? (
            <div className="rk-sh-state">
              <div className="spinner" aria-label="Loading" />
              Loading attributes…
            </div>
          ) : rows.length === 0 ? (
            <div className="rk-sh-empty">
              <div className="rk-sh-empty__icon">
                <EmptyAttributesIcon />
              </div>
              <h3 className="rk-sh-empty__title">No attributes yet</h3>
              <p className="rk-sh-empty__text">
                {canManage
                  ? 'Add a few core dimensions (e.g. Technical skills, Communication) before defining stages so each stage can map focus areas.'
                  : 'Attributes will appear here once a hiring manager or admin creates them.'}
              </p>
              {canManage ? (
                <div className="rk-sh-empty__actions">
                  <button type="button" className="rk-sh-btn rk-sh-btn-primary" onClick={openCreate}>
                    Add attribute
                  </button>
                </div>
              ) : null}
            </div>
          ) : (
            <ul className="rk-structured-list">
              {rows.map(r => (
                <li key={r.id} className="rk-structured-list-row">
                  <div className="rk-structured-list-main">
                    <div className="rk-structured-list-title">{r.name}</div>
                    {r.category ? (
                      <div className="rk-structured-list-meta" style={{ marginTop: 6 }}>
                        <span className="rk-sh-badge">{r.category}</span>
                      </div>
                    ) : null}
                    {r.description ? <div className="rk-structured-list-desc">{r.description}</div> : null}
                  </div>
                  {canManage ? (
                    <div className="rk-structured-row-actions rk-structured-row-actions--row">
                      <button type="button" className="rk-btn rk-btn-secondary rk-btn--compact" onClick={() => openEdit(r)}>
                        Edit
                      </button>
                      <button type="button" className="rk-btn rk-btn-danger rk-btn--compact" onClick={() => openDelete(r)}>
                        Delete
                      </button>
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {isFormModal ? (
        <div
          className="modal-overlay"
          role="presentation"
          onClick={() => {
            if (!saving) closeModal()
          }}
        >
          <div
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby={modalTitleId}
            onClick={e => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2 id={modalTitleId} className="modal-title">
                {modal.kind === 'create' ? 'Add attribute' : 'Edit attribute'}
              </h2>
              <button type="button" className="modal-close" aria-label="Close" disabled={saving} onClick={closeModal}>
                ×
              </button>
            </div>
            <div className="modal-body" style={{ fontFamily: 'var(--rk-font, inherit)' }}>
              <div className="rk-field" style={{ marginBottom: 16 }}>
                <label className="rk-label" htmlFor="ha-modal-name">
                  Name
                </label>
                <input
                  id="ha-modal-name"
                  className="rk-input"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g. Problem solving"
                  autoComplete="off"
                />
              </div>
              <div className="rk-field" style={{ marginBottom: 16 }}>
                <label className="rk-label" htmlFor="ha-modal-cat">
                  Category (optional)
                </label>
                <input
                  id="ha-modal-cat"
                  className="rk-input"
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                  placeholder="e.g. Engineering"
                  autoComplete="off"
                />
              </div>
              <div className="rk-field">
                <label className="rk-label" htmlFor="ha-modal-desc">
                  Description
                </label>
                <textarea
                  id="ha-modal-desc"
                  className="rk-textarea rk-textarea--compact"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  rows={3}
                  placeholder="Short guidance for interviewers…"
                />
              </div>
            </div>
            <div className="rk-sh-modal-footer">
              <button type="button" className="rk-btn rk-btn-secondary" disabled={saving} onClick={closeModal}>
                Cancel
              </button>
              <button type="button" className="rk-btn rk-btn-primary" disabled={saving} onClick={() => void saveForm()}>
                {saving ? 'Saving…' : modal.kind === 'create' ? 'Create attribute' : 'Save changes'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {modal?.kind === 'delete' ? (
        <div
          className="modal-overlay"
          role="presentation"
          onClick={() => {
            if (!deleting) closeModal()
          }}
        >
          <div
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="ha-delete-modal-title"
            onClick={e => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2 id="ha-delete-modal-title" className="modal-title">
                Delete attribute
              </h2>
              <button type="button" className="modal-close" aria-label="Close" disabled={deleting} onClick={closeModal}>
                ×
              </button>
            </div>
            <div className="modal-body">
              <p style={{ margin: 0, fontSize: 14, lineHeight: 1.55, color: 'var(--text-secondary)' }}>
                Delete <strong style={{ color: 'var(--text-primary)' }}>{modal.row.name}</strong>? This cannot be undone.
                Stages that reference this attribute may need to be updated.
              </p>
            </div>
            <div className="rk-sh-modal-footer">
              <button type="button" className="rk-btn rk-btn-secondary" disabled={deleting} onClick={closeModal}>
                Cancel
              </button>
              <button type="button" className="rk-btn rk-btn-danger" disabled={deleting} onClick={() => void confirmDelete()}>
                {deleting ? 'Deleting…' : 'Delete attribute'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
