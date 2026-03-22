import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { useAuth } from '../../auth/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import { labelsApi, type AccountLabelRow } from '../../api/labels'

export default function LabelsSettingsPage() {
  const { getToken } = useAuth()
  const { success, error: showError } = useToast()
  const token = getToken()
  const titleId = useId()
  const panelRef = useRef<HTMLDivElement>(null)

  const [rows, setRows] = useState<AccountLabelRow[]>([])
  const [loading, setLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<AccountLabelRow | null>(null)

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [color, setColor] = useState('')
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    if (!token) return
    setLoading(true)
    try {
      const data = await labelsApi.list(token)
      setRows(data.sort((a, b) => a.title.localeCompare(b.title)))
    } catch (e) {
      showError('Could not load labels', e instanceof Error ? e.message : undefined)
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [token, showError])

  useEffect(() => {
    void load()
  }, [load])

  const resetForm = () => {
    setTitle('')
    setDescription('')
    setColor('')
    setEditing(null)
  }

  const openCreate = () => {
    resetForm()
    setModalOpen(true)
  }

  const openEdit = (r: AccountLabelRow) => {
    setEditing(r)
    setTitle(r.title)
    setDescription(r.description ?? '')
    setColor(r.color ?? '')
    setModalOpen(true)
  }

  const closeModal = () => {
    setModalOpen(false)
    resetForm()
  }

  useEffect(() => {
    if (!modalOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        closeModal()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      document.removeEventListener('keydown', onKey)
    }
  }, [modalOpen])

  useEffect(() => {
    if (!modalOpen) return
    const t = window.setTimeout(() => {
      panelRef.current?.querySelector<HTMLElement>('input')?.focus()
    }, 0)
    return () => window.clearTimeout(t)
  }, [modalOpen])

  const submit = async () => {
    if (!token) return
    const t = title.trim()
    if (!t) {
      showError('Title required')
      return
    }
    setSaving(true)
    try {
      if (editing) {
        await labelsApi.update(token, editing.id, {
          title: t,
          description: description.trim() ? description.trim() : null,
          color: color.trim() ? color.trim() : null,
        })
        success('Label updated')
      } else {
        await labelsApi.create(token, {
          title: t,
          description: description.trim() || undefined,
          color: color.trim() || undefined,
        })
        success('Label created')
      }
      closeModal()
      await load()
    } catch (e) {
      showError('Save failed', e instanceof Error ? e.message : undefined)
    } finally {
      setSaving(false)
    }
  }

  const remove = async (r: AccountLabelRow) => {
    if (!token) return
    if (!window.confirm(`Delete label “${r.title}”? It will be removed from all jobs and candidates.`)) return
    try {
      await labelsApi.destroy(token, r.id)
      success('Label deleted')
      await load()
    } catch (e) {
      showError('Delete failed', e instanceof Error ? e.message : undefined)
    }
  }

  return (
    <div className="settings-labels-page">
      <div className="settings-org-toolbar">
        <div>
          <h2 className="settings-org-title">Labels</h2>
          <p className="settings-lead settings-lead--tight">
            Account-wide tags with a short description (similar to Chatwoot). Apply them on any job or candidate; search
            indexing runs in the background worker for scale.
          </p>
        </div>
        <button type="button" className="btn-primary btn-primary--inline" onClick={openCreate}>
          + New label
        </button>
      </div>

      {loading ? (
        <p className="settings-muted">Loading…</p>
      ) : rows.length === 0 ? (
        <div className="settings-labels-empty">
          <p>No labels yet. Create one to organize jobs and candidates consistently.</p>
        </div>
      ) : (
        <div className="settings-labels-table-wrap">
          <table className="settings-labels-table">
            <thead>
              <tr>
                <th scope="col">Label</th>
                <th scope="col">Description</th>
                <th scope="col">Color</th>
                <th scope="col" className="settings-labels-col-actions">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.id}>
                  <td>
                    <span className="settings-labels-title-cell">
                      <span
                        className="label-multi-swatch label-multi-swatch--table"
                        style={{ background: r.color?.trim() || 'var(--teal, #00b4d8)' }}
                        aria-hidden
                      />
                      {r.title}
                    </span>
                  </td>
                  <td className="settings-labels-desc-cell">{r.description || '—'}</td>
                  <td>
                    <code className="settings-labels-code">{r.color || '—'}</code>
                  </td>
                  <td className="settings-labels-col-actions">
                    <button type="button" className="btn-link-quiet" onClick={() => openEdit(r)}>
                      Edit
                    </button>
                    <button type="button" className="btn-link-quiet btn-link-quiet--danger" onClick={() => void remove(r)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modalOpen && (
        <div
          className="esign-modal-backdrop"
          role="presentation"
          onClick={e => {
            if (e.target === e.currentTarget) closeModal()
          }}
        >
          <div
            ref={panelRef}
            className="esign-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            onClick={e => e.stopPropagation()}
          >
            <header className="esign-modal-header">
              <div>
                <h2 id={titleId} className="esign-modal-title">
                  {editing ? 'Edit label' : 'New label'}
                </h2>
                <p className="esign-modal-sub">
                  {editing ? 'Changes apply everywhere this label is used.' : 'Visible on jobs and candidates across your workspace.'}
                </p>
              </div>
              <button type="button" className="esign-modal-close" onClick={closeModal} aria-label="Close">
                ×
              </button>
            </header>
            <div className="esign-modal-body">
              <div className="esign-field-block">
                <label htmlFor="lbl-title">Title</label>
                <input
                  id="lbl-title"
                  className="esign-pro-input"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="e.g. Priority"
                  maxLength={160}
                />
              </div>
              <div className="esign-field-block">
                <label htmlFor="lbl-desc">Description</label>
                <textarea
                  id="lbl-desc"
                  className="esign-pro-input"
                  rows={3}
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="What this label means for your team…"
                />
              </div>
              <div className="esign-field-block">
                <label htmlFor="lbl-color">Color (optional)</label>
                <input
                  id="lbl-color"
                  className="esign-pro-input"
                  value={color}
                  onChange={e => setColor(e.target.value)}
                  placeholder="#00b4d8 or CSS color name"
                />
                <p className="esign-pro-field-hint esign-modal-hint">Used as the swatch in lists and pickers.</p>
              </div>
            </div>
            <footer className="esign-modal-footer">
              <button type="button" className="esign-pro-btn-quiet" onClick={closeModal} disabled={saving}>
                Cancel
              </button>
              <button type="button" className="btn-primary btn-primary--inline" onClick={() => void submit()} disabled={saving}>
                {saving ? 'Saving…' : editing ? 'Save changes' : 'Create label'}
              </button>
            </footer>
          </div>
        </div>
      )}
    </div>
  )
}
