import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import { useAuth } from '../../auth/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import {
  customAttributesApi,
  type CustomAttributeDefinition,
  type CustomAttributeEntityType,
} from '../../api/customAttributes'

const FIELD_TYPES: CustomAttributeDefinition['field_type'][] = [
  'text',
  'number',
  'decimal',
  'boolean',
  'date',
  'list',
]

const FIELD_TYPE_LABELS: Record<CustomAttributeDefinition['field_type'], string> = {
  text: 'Short text',
  number: 'Whole number',
  decimal: 'Decimal',
  boolean: 'Yes / No',
  date: 'Date',
  list: 'Dropdown',
}

export default function CustomFieldsEntityPage({ entityType }: { entityType: CustomAttributeEntityType }) {
  const { getToken } = useAuth()
  const { success, error: showError } = useToast()
  const token = getToken()
  const titleId = useId()
  const panelRef = useRef<HTMLDivElement>(null)

  const [rows, setRows] = useState<CustomAttributeDefinition[]>([])
  const [loading, setLoading] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)

  const [newKey, setNewKey] = useState('')
  const [newLabel, setNewLabel] = useState('')
  const [newType, setNewType] = useState<CustomAttributeDefinition['field_type']>('text')
  const [newOptions, setNewOptions] = useState('')
  const [newRequired, setNewRequired] = useState(false)
  const [adding, setAdding] = useState(false)

  const scopeTitle = entityType === 'job' ? 'Job requisitions' : 'Applications & apply flow'
  const typeHint = useMemo(() => {
    const d: Record<CustomAttributeDefinition['field_type'], string> = {
      text: 'Free-form text.',
      number: 'Integers only.',
      decimal: 'Numbers with decimals.',
      boolean: 'Checkbox on forms.',
      date: 'Date value (YYYY-MM-DD).',
      list: 'Candidate picks one option; add each choice on its own line below.',
    }
    return d[newType]
  }, [newType])

  const resetCreateForm = useCallback(() => {
    setNewKey('')
    setNewLabel('')
    setNewType('text')
    setNewOptions('')
    setNewRequired(false)
  }, [])

  const load = useCallback(async () => {
    if (!token) return
    setLoading(true)
    try {
      const data = await customAttributesApi.list(token, entityType)
      setRows(data.sort((a, b) => a.position - b.position || a.id - b.id))
    } catch (e) {
      showError('Could not load', e instanceof Error ? e.message : undefined)
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [token, entityType, showError])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (!createOpen) return
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        setCreateOpen(false)
        resetCreateForm()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prevOverflow
      document.removeEventListener('keydown', onKey)
    }
  }, [createOpen, resetCreateForm])

  useEffect(() => {
    if (!createOpen) return
    const t = window.setTimeout(() => {
      const root = panelRef.current
      const focusable = root?.querySelector<HTMLElement>(
        '.esign-modal-body button, .esign-modal-body select, .esign-modal-body input, .esign-modal-body textarea',
      )
      focusable?.focus()
    }, 0)
    return () => window.clearTimeout(t)
  }, [createOpen])

  const openCreate = () => {
    resetCreateForm()
    setCreateOpen(true)
  }

  const closeCreate = () => {
    setCreateOpen(false)
    resetCreateForm()
  }

  const addField = async () => {
    if (!token) return
    const key = newKey.trim().toLowerCase()
    if (!/^[a-z][a-z0-9_]{0,62}$/.test(key)) {
      showError(
        'Invalid key',
        'Lowercase letters, digits, underscores; start with a letter (e.g. notice_period).',
      )
      return
    }
    const label = newLabel.trim()
    if (!label) {
      showError('Label required', undefined)
      return
    }
    const options =
      newType === 'list'
        ? newOptions
            .split('\n')
            .map(s => s.trim())
            .filter(Boolean)
        : []
    if (newType === 'list' && options.length === 0) {
      showError('Options required', 'Add at least one line for dropdown choices.')
      return
    }
    setAdding(true)
    try {
      await customAttributesApi.create(token, {
        entity_type: entityType,
        attribute_key: key,
        label,
        field_type: newType,
        options: newType === 'list' ? options : undefined,
        required: newRequired,
        position: rows.length,
      })
      success('Saved', `${label} added.`)
      closeCreate()
      await load()
    } catch (e) {
      showError('Could not add', e instanceof Error ? e.message : undefined)
    } finally {
      setAdding(false)
    }
  }

  const remove = async (r: CustomAttributeDefinition) => {
    if (!token) return
    if (!window.confirm(`Remove “${r.label}” (${r.attribute_key})?`)) return
    try {
      await customAttributesApi.delete(token, r.id)
      success('Removed', r.label)
      await load()
    } catch (e) {
      showError('Delete failed', e instanceof Error ? e.message : undefined)
    }
  }

  if (!token) return null

  return (
    <div className="esign-page-pro">
      <div className="esign-templates-toolbar">
        <p className="esign-templates-lead">
          <strong>{scopeTitle}.</strong> Values are validated on save. Keys like{' '}
          <code className="esign-pro-code">notice_period</code> or <code className="esign-pro-code">source_type</code>{' '}
          work well for reporting.
        </p>
        <button type="button" className="btn-primary btn-primary--inline" onClick={openCreate}>
          <span aria-hidden>+</span> Create attribute
        </button>
      </div>

      {loading ? (
        <div className="esign-pro-loading" aria-busy="true">
          Loading…
        </div>
      ) : rows.length === 0 ? (
        <div className="esign-templates-empty esign-templates-empty--compact">
          <p>No attributes yet for this scope.</p>
          <button type="button" className="btn-primary btn-primary--inline" onClick={openCreate}>
            Create your first attribute
          </button>
        </div>
      ) : (
        <section className="esign-pro-card">
          <h2 className="esign-pro-card-title">Defined attributes</h2>
          <p className="esign-pro-card-desc">Shown on forms; stored as JSON on each record.</p>
          <div className="esign-pro-table-wrap">
            <table className="esign-pro-table esign-templates-table">
              <thead>
                <tr>
                  <th scope="col">Label</th>
                  <th scope="col">API key</th>
                  <th scope="col">Type</th>
                  <th scope="col">Required</th>
                  <th scope="col" className="esign-pro-table-actions">
                    <span className="visually-hidden">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map(r => (
                  <tr key={r.id}>
                    <td className="esign-pro-table-strong">{r.label}</td>
                    <td>
                      <code className="esign-pro-code">{r.attribute_key}</code>
                    </td>
                    <td className="esign-pro-table-muted">{FIELD_TYPE_LABELS[r.field_type]}</td>
                    <td className="esign-pro-table-muted">{r.required ? 'Yes' : '—'}</td>
                    <td className="esign-pro-table-actions">
                      <button type="button" className="esign-pro-link" onClick={() => void remove(r)}>
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {createOpen && (
        <div
          className="esign-modal-backdrop"
          role="presentation"
          onClick={e => {
            if (e.target === e.currentTarget) closeCreate()
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
                  New attribute
                </h2>
                <p className="esign-modal-sub">
                  {entityType === 'job' ? 'Adds a field to job requisitions.' : 'Adds a field to applications and the public apply form.'}
                </p>
              </div>
              <button type="button" className="esign-modal-close" onClick={closeCreate} aria-label="Close">
                ×
              </button>
            </header>
            <div className="esign-modal-body">
              <div className="esign-editor-meta-grid">
                <div className="esign-field-block">
                  <label htmlFor={`cf-modal-key-${entityType}`}>API key</label>
                  <input
                    id={`cf-modal-key-${entityType}`}
                    className="esign-pro-input"
                    value={newKey}
                    onChange={e => setNewKey(e.target.value)}
                    placeholder="notice_period"
                    autoComplete="off"
                    spellCheck={false}
                  />
                  <p className="esign-pro-field-hint esign-modal-hint">Snake_case; cannot change after create.</p>
                </div>
                <div className="esign-field-block">
                  <label htmlFor={`cf-modal-label-${entityType}`}>Label</label>
                  <input
                    id={`cf-modal-label-${entityType}`}
                    className="esign-pro-input"
                    value={newLabel}
                    onChange={e => setNewLabel(e.target.value)}
                    placeholder="Notice period"
                  />
                </div>
              </div>

              <div className="esign-field-block">
                <label htmlFor={`cf-modal-type-${entityType}`}>Data type</label>
                <select
                  id={`cf-modal-type-${entityType}`}
                  className="esign-pro-input"
                  value={newType}
                  onChange={e => setNewType(e.target.value as typeof newType)}
                >
                  {FIELD_TYPES.map(ft => (
                    <option key={ft} value={ft}>
                      {FIELD_TYPE_LABELS[ft]}
                    </option>
                  ))}
                </select>
                <p className="esign-pro-field-hint esign-modal-hint">{typeHint}</p>
              </div>

              {newType === 'list' && (
                <div className="esign-field-block">
                  <label htmlFor={`cf-modal-opts-${entityType}`}>Dropdown options (one per line)</label>
                  <textarea
                    id={`cf-modal-opts-${entityType}`}
                    className="esign-pro-input"
                    rows={5}
                    value={newOptions}
                    onChange={e => setNewOptions(e.target.value)}
                    placeholder={'LinkedIn\nReferral\nAgency'}
                  />
                </div>
              )}

              <div className="esign-field-block">
                <label htmlFor={`cf-modal-req-${entityType}`} className="esign-field-block-check">
                  <input
                    id={`cf-modal-req-${entityType}`}
                    type="checkbox"
                    checked={newRequired}
                    onChange={e => setNewRequired(e.target.checked)}
                  />
                  <span>Required when saving or applying</span>
                </label>
              </div>
            </div>
            <footer className="esign-modal-footer">
              <button type="button" className="esign-pro-btn-quiet" onClick={closeCreate} disabled={adding}>
                Cancel
              </button>
              <button
                type="button"
                className="btn-primary btn-primary--inline"
                disabled={adding}
                onClick={() => void addField()}
              >
                {adding ? 'Creating…' : 'Create attribute'}
              </button>
            </footer>
          </div>
        </div>
      )}
    </div>
  )
}
