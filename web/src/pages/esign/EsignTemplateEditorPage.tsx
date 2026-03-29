import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'
import { esignApi } from '../../api/esign'
import { useToast } from '../../contexts/ToastContext'
import { EsignTemplateBuilder } from '../../components/EsignTemplateBuilder'
import { documentFromTemplateRow, emptyDocument, type TemplateDocument } from '../../esign/templateDocument'
import { ESIGN_MERGE_CHIPS, ESIGN_MERGE_MORE } from '../../esign/esignConstants'

export default function EsignTemplateEditorPage() {
  const { accountId, templateId } = useParams<{ accountId: string; templateId?: string }>()
  const navigate = useNavigate()
  const { getToken } = useAuth()
  const { error: showError, success: showSuccess, info: showInfo } = useToast()
  const token = getToken()

  /** Route `templates/new` has no param; `templates/:id/edit` supplies numeric id */
  const isNew = !templateId
  const editId = templateId ? Number(templateId) : NaN

  const listPath = `/account/${accountId}/settings/esign/templates`

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [doc, setDoc] = useState<TemplateDocument>(() => emptyDocument())
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null)
  const [loading, setLoading] = useState(!isNew)
  const [saving, setSaving] = useState(false)

  const copyToken = useCallback(
    async (t: string) => {
      try {
        await navigator.clipboard.writeText(t)
        showSuccess('Copied', t)
      } catch {
        showInfo('Copy', t)
      }
    },
    [showSuccess, showInfo],
  )

  useEffect(() => {
    if (!token || isNew || !Number.isFinite(editId)) {
      setLoading(false)
      return
    }
    let cancelled = false
    void (async () => {
      setLoading(true)
      try {
        const row = await esignApi.getTemplate(token, editId)
        if (cancelled) return
        setName(row.name)
        setDescription(row.description || '')
        setDoc(documentFromTemplateRow(row.content_blocks, row.content_html))
        setSelectedBlockId(null)
      } catch {
        if (!cancelled) {
          showError('Template not found')
          navigate(listPath, { replace: true })
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [token, isNew, editId, navigate, listPath, showError])

  async function save() {
    if (!token) return
    const n = name.trim()
    if (!n) {
      showError('Name required')
      return
    }
    if (doc.blocks.length === 0) {
      showError('Add at least one block to the canvas')
      return
    }
    setSaving(true)
    try {
      if (isNew) {
        await esignApi.createTemplate(token, {
          name: n,
          description: description.trim() || undefined,
          content_blocks: doc,
        })
        showSuccess('Template created')
      } else {
        await esignApi.updateTemplate(token, editId, {
          name: n,
          description: description.trim() || null,
          content_blocks: doc,
        })
        showSuccess('Template saved')
      }
      navigate(listPath)
    } catch (e) {
      showError('Save failed', e instanceof Error ? e.message : undefined)
    } finally {
      setSaving(false)
    }
  }

  if (!token) return null

  const esignBase = `/account/${accountId}/settings/esign`

  return (
    <div className="esign-editor-page">
      <header className="esign-editor-toolbar">
        <div className="esign-editor-toolbar-inner">
          <nav className="esign-editor-breadcrumb" aria-label="Breadcrumb">
            <Link to={`${esignBase}/overview`} className="esign-editor-bc-link">
              E-sign
            </Link>
            <span className="esign-editor-bc-sep" aria-hidden>
              /
            </span>
            <Link to={listPath} className="esign-editor-bc-link">
              Templates
            </Link>
            <span className="esign-editor-bc-sep" aria-hidden>
              /
            </span>
            <span className="esign-editor-bc-current">{isNew ? 'New' : 'Edit'}</span>
          </nav>
          <div className="esign-editor-actions">
            <Link to={listPath} className="esign-pro-btn-quiet">
              Cancel
            </Link>
            <button type="button" className="btn-primary" disabled={saving || loading} onClick={() => void save()}>
              {saving ? 'Saving…' : isNew ? 'Create template' : 'Save changes'}
            </button>
          </div>
        </div>
      </header>

      {loading ? (
        <div className="esign-pro-loading">Loading template…</div>
      ) : (
        <>
          <section className="esign-editor-meta-card" aria-labelledby="esign-editor-meta-heading">
            <h2 id="esign-editor-meta-heading" className="esign-editor-meta-heading">
              Template details
            </h2>
            <div className="esign-editor-meta-grid">
              <div className="esign-field-block">
                <label htmlFor="tpl-name">Display name</label>
                <input
                  id="tpl-name"
                  className="esign-pro-input"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g. Offer letter"
                />
              </div>
              <div className="esign-field-block">
                <label htmlFor="tpl-desc">Internal note (optional)</label>
                <input
                  id="tpl-desc"
                  className="esign-pro-input"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Only visible to your team"
                />
              </div>
            </div>
            <p className="esign-editor-hint">
              Blocks are stored as JSON; the server builds HTML for signing. Use placeholders like{' '}
              <code>{'{candidate_name}'}</code>, <code>{'{job_title}'}</code>, <code>{'{salary_range}'}</code>.
            </p>
          </section>

          <section className="esign-editor-workspace" aria-label="Block editor">
            <div className="esign-editor-workspace-head">
              <h2 className="esign-editor-workspace-title">Document builder</h2>
              <p className="esign-editor-workspace-sub">
                A live preview of what candidates see. Drag blocks, reorder, style in the inspector, and paste merge tags
                from the panel.
              </p>
            </div>
            <div className="esign-editor-canvas-wrap">
            <EsignTemplateBuilder
              document={doc}
              onDocumentChange={setDoc}
              selectedId={selectedBlockId}
              onSelectId={setSelectedBlockId}
              mergeChips={ESIGN_MERGE_CHIPS}
              onCopyToken={t => void copyToken(t)}
              morePlaceholders={ESIGN_MERGE_MORE}
            />
            </div>
          </section>
        </>
      )}
    </div>
  )
}
