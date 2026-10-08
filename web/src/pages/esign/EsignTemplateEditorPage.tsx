import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'
import { esignApi } from '../../api/esign'
import { useToast } from '../../contexts/ToastContext'
import { EsignTemplateBuilder } from '../../components/EsignTemplateBuilder'
import { LoadingState } from '../../components/EmptyState'
import { Icon, Icon3D } from '../../icons'
import { documentFromTemplateRow, emptyDocument, type TemplateDocument } from '../../esign/templateDocument'
import { ESIGN_MERGE_CHIPS, ESIGN_MERGE_MORE } from '../../esign/esignConstants'
import { TEMPLATE_STARTERS, sampleMergeData, type TemplateStarter } from '../../esign/templateStarters'

const snapshot = (name: string, description: string, doc: TemplateDocument) => JSON.stringify([name.trim(), description.trim(), doc])

function isTypingTarget(el: EventTarget | null) {
  return el instanceof HTMLElement && (el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName))
}

function StarterGallery({ onPick, onCancel }: { onPick: (s: TemplateStarter) => void; onCancel: () => void }) {
  return (
    <div className="tpl-starters">
      <div className="tpl-starters-head">
        <Icon3D name="esign" size={64} tile />
        <div>
          <h2>Create a signing template</h2>
          <p>Pick a starting point — everything stays editable, and merge tags fill in for each candidate.</p>
        </div>
        <button type="button" className="btn-secondary btn-secondary--inline" onClick={onCancel}>
          Cancel
        </button>
      </div>
      <div className="tpl-starters-grid">
        {TEMPLATE_STARTERS.map(s => {
          const preview = s.build().blocks.slice(0, 8)
          return (
            <button key={s.id} type="button" className="tpl-starter" onClick={() => onPick(s)}>
              <span className="tpl-starter-sheet" aria-hidden>
                <span className="tpl-starter-page">
                  {preview.map((b, i) => (
                    <span key={b.id} className={`tpl-starter-line tpl-starter-line--${b.type}${i === 0 ? ' is-first' : ''}`} />
                  ))}
                </span>
              </span>
              <span className="tpl-starter-body">
                <Icon3D name={s.icon} size={40} />
                <span>
                  <span className="tpl-starter-name">{s.name}</span>
                  <span className="tpl-starter-desc">{s.description}</span>
                </span>
              </span>
              <span className="tpl-starter-cta">
                Use this <Icon name="arrowRight" size={14} />
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default function EsignTemplateEditorPage() {
  const { accountId, templateId } = useParams<{ accountId: string; templateId?: string }>()
  const navigate = useNavigate()
  const { getToken, user } = useAuth()
  const { error: showError, success: showSuccess, info: showInfo } = useToast()
  const token = getToken()

  /** Route `templates/new` has no param; `templates/:id/edit` supplies numeric id */
  const isNew = !templateId
  const editId = templateId ? Number(templateId) : NaN
  const listPath = `/account/${accountId}/settings/esign/templates`
  const esignBase = `/account/${accountId}/settings/esign`

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [doc, setDoc] = useState<TemplateDocument>(() => emptyDocument())
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null)
  const [loading, setLoading] = useState(!isNew)
  const [saving, setSaving] = useState(false)
  const [started, setStarted] = useState(!isNew)
  const [mode, setMode] = useState<'edit' | 'preview'>('edit')
  const [saved, setSaved] = useState<string | null>(null)
  const [hist, setHist] = useState<{ past: TemplateDocument[]; future: TemplateDocument[] }>({ past: [], future: [] })
  const lastPush = useRef(0)

  const sample = useMemo(() => sampleMergeData(user?.account?.name ?? ''), [user?.account?.name])
  const dirty = saved === null ? started : saved !== snapshot(name, description, doc)
  const usedTokens = useMemo(() => {
    const found = new Set<string>()
    for (const m of JSON.stringify(doc.blocks).matchAll(/\{[a-z_]+\}/g)) found.add(m[0])
    return [...found]
  }, [doc.blocks])

  /** Document edits go through history; rapid typing is coalesced into one undo step. */
  const updateDoc = useCallback(
    (next: TemplateDocument) => {
      const now = Date.now()
      if (now - lastPush.current > 600) setHist(h => ({ past: [...h.past.slice(-99), doc], future: [] }))
      else setHist(h => (h.future.length ? { ...h, future: [] } : h))
      lastPush.current = now
      setDoc(next)
    },
    [doc],
  )

  const undo = useCallback(() => {
    if (hist.past.length === 0) return
    const prev = hist.past[hist.past.length - 1]
    setHist({ past: hist.past.slice(0, -1), future: [doc, ...hist.future] })
    setDoc(prev)
    lastPush.current = 0
  }, [hist, doc])

  const redo = useCallback(() => {
    if (hist.future.length === 0) return
    const [next, ...rest] = hist.future
    setHist({ past: [...hist.past, doc], future: rest })
    setDoc(next)
    lastPush.current = 0
  }, [hist, doc])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || isTypingTarget(e.target)) return
      const k = e.key.toLowerCase()
      if (k === 'z' && !e.shiftKey) {
        e.preventDefault()
        undo()
      } else if ((k === 'z' && e.shiftKey) || k === 'y') {
        e.preventDefault()
        redo()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [undo, redo])

  // Warn before closing the tab with unsaved work.
  useEffect(() => {
    if (!dirty) return
    const onBeforeUnload = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [dirty])

  const copyToken = useCallback(
    async (t: string) => {
      try {
        await navigator.clipboard.writeText(t)
        showSuccess('Copied merge tag', `${t} — select a text field to insert it directly.`)
      } catch {
        showInfo('Merge tag', t)
      }
    },
    [showSuccess, showInfo],
  )

  useEffect(() => {
    if (!token || isNew || !Number.isFinite(editId)) return
    let cancelled = false
    void (async () => {
      try {
        const row = await esignApi.getTemplate(token, editId)
        if (cancelled) return
        const loaded = documentFromTemplateRow(row.content_blocks, row.content_html)
        setName(row.name)
        setDescription(row.description || '')
        setDoc(loaded)
        setSaved(snapshot(row.name, row.description || '', loaded))
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

  function pickStarter(s: TemplateStarter) {
    setDoc(s.build())
    setHist({ past: [], future: [] })
    if (!name.trim() && s.id !== 'blank') setName(s.name)
    setSelectedBlockId(null)
    setStarted(true)
  }

  async function save() {
    if (!token) return
    const n = name.trim()
    if (!n) {
      showError('Name required', 'Give the template a name in the title field.')
      document.getElementById('tpl-title-input')?.focus()
      return
    }
    if (doc.blocks.length === 0) {
      showError('The page is empty', 'Add at least one block before saving.')
      return
    }
    setSaving(true)
    try {
      if (isNew) {
        await esignApi.createTemplate(token, { name: n, description: description.trim() || undefined, content_blocks: doc })
        showSuccess('Template created')
      } else {
        await esignApi.updateTemplate(token, editId, { name: n, description: description.trim() || null, content_blocks: doc })
        showSuccess('Template saved')
      }
      setSaved(snapshot(n, description, doc))
      navigate(listPath)
    } catch (e) {
      showError('Save failed', e instanceof Error ? e.message : undefined)
    } finally {
      setSaving(false)
    }
  }

  function cancel() {
    if (dirty && !confirm('Discard unsaved changes to this template?')) return
    navigate(listPath)
  }

  if (!token) return null

  if (isNew && !started) {
    return <StarterGallery onPick={pickStarter} onCancel={() => navigate(listPath)} />
  }

  const detailsPanel = (
    <div className="tpl-details">
      <div className="tpl-inspector-head">
        <span className="tpl-inspector-icon">
          <Icon name="settings" size={18} />
        </span>
        <div>
          <p className="tpl-inspector-title">Template details</p>
          <p className="tpl-inspector-sub">Select a block on the page to style it</p>
        </div>
      </div>
      <div className="tpl-fields">
        <label className="tpl-field">
          <span className="tpl-label">Display name</span>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Offer letter" />
        </label>
        <label className="tpl-field">
          <span className="tpl-label">Internal note</span>
          <textarea rows={3} value={description} onChange={e => setDescription(e.target.value)} placeholder="Only visible to your team" />
        </label>
      </div>
      <div className="tpl-details-stats">
        <div>
          <strong>{doc.blocks.length}</strong>
          <span>Blocks</span>
        </div>
        <div>
          <strong>{usedTokens.length}</strong>
          <span>Merge tags</span>
        </div>
      </div>
      {usedTokens.length ? (
        <div className="tpl-details-tokens">
          <span className="tpl-label">Used in this document</span>
          <div>
            {usedTokens.map(t => (
              <code key={t} className={sample[t.slice(1, -1)] ? '' : 'is-unknown'} title={sample[t.slice(1, -1)] ? `e.g. ${sample[t.slice(1, -1)]}` : 'Unknown tag'}>
                {t}
              </code>
            ))}
          </div>
        </div>
      ) : null}
      <div className="tpl-details-tip">
        <Icon name="sparkle" size={15} />
        <p>
          Merge tags like <code>{'{candidate_name}'}</code> are replaced for each candidate. Switch to <strong>Preview</strong> to read the
          letter with sample data.
        </p>
      </div>
    </div>
  )

  return (
    <div className="tpl-studio">
      <header className="tpl-bar">
        <button type="button" className="tpl-bar-back" onClick={cancel} aria-label="Back to templates">
          <Icon name="arrowLeft" size={18} />
        </button>
        <Icon3D name="esign" size={42} tile />
        <div className="tpl-bar-title">
          <input
            id="tpl-title-input"
            className="tpl-title-input"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Untitled template"
            aria-label="Template name"
          />
          <div className="tpl-bar-crumbs">
            <Link to={`${esignBase}/overview`}>E-sign</Link>
            <span aria-hidden>/</span>
            <Link to={listPath}>Templates</Link>
            <span className={`tpl-status${dirty ? ' tpl-status--dirty' : ''}`}>
              {isNew ? 'Draft · not saved yet' : dirty ? 'Unsaved changes' : 'All changes saved'}
            </span>
          </div>
        </div>

        <div className="tpl-mode" role="tablist" aria-label="Mode">
          <button type="button" role="tab" aria-selected={mode === 'edit'} className={mode === 'edit' ? 'is-active' : ''} onClick={() => setMode('edit')}>
            <Icon name="edit" size={15} /> Edit
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'preview'}
            className={mode === 'preview' ? 'is-active' : ''}
            onClick={() => {
              setMode('preview')
              setSelectedBlockId(null)
            }}
          >
            <Icon name="eye" size={15} /> Preview
          </button>
        </div>

        <div className="tpl-bar-actions">
          <div className="tpl-history">
            <button type="button" onClick={undo} disabled={hist.past.length === 0} title="Undo (Ctrl+Z)" aria-label="Undo">
              <Icon name="undo" size={16} />
            </button>
            <button type="button" onClick={redo} disabled={hist.future.length === 0} title="Redo (Ctrl+Shift+Z)" aria-label="Redo">
              <Icon name="redo" size={16} />
            </button>
          </div>
          <button type="button" className="btn-secondary btn-secondary--inline" onClick={cancel}>
            Cancel
          </button>
          <button type="button" className="btn-primary btn-primary--inline" disabled={saving || loading} onClick={() => void save()}>
            {saving ? (
              <>
                <span className="btn-spinner" aria-hidden /> Saving…
              </>
            ) : (
              <>
                <Icon name="check" size={16} strokeWidth={2.2} /> {isNew ? 'Create template' : 'Save changes'}
              </>
            )}
          </button>
        </div>
      </header>

      {loading ? (
        <div className="tpl-loading">
          <LoadingState rows={6} label="Loading template" />
        </div>
      ) : (
        <EsignTemplateBuilder
          document={doc}
          onDocumentChange={updateDoc}
          selectedId={selectedBlockId}
          onSelectId={setSelectedBlockId}
          mergeChips={ESIGN_MERGE_CHIPS}
          onCopyToken={t => void copyToken(t)}
          morePlaceholders={ESIGN_MERGE_MORE}
          mode={mode}
          sampleData={sample}
          detailsPanel={detailsPanel}
          paperTitle={name.trim() || 'Untitled template'}
        />
      )}
    </div>
  )
}
