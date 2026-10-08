import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'
import { esignApi, type EsignTemplate } from '../../api/esign'
import { useToast } from '../../contexts/ToastContext'
import { EmptyState } from '../../components/EmptyState'
import { Icon } from '../../icons'
import { documentFromTemplateRow, type TemplateBlock } from '../../esign/templateDocument'

/** Thumbnail of a template: one skeleton line per block, shaped like the block. */
function MiniPage({ blocks }: { blocks: TemplateBlock[] }) {
  return (
    <span className="tpl-card-sheet" aria-hidden>
      <span className="tpl-starter-page">
        {blocks.slice(0, 9).map((b, i) => (
          <span key={b.id} className={`tpl-starter-line tpl-starter-line--${b.type}${i === 0 ? ' is-first' : ''}`} />
        ))}
      </span>
    </span>
  )
}

function relativeDate(iso: string) {
  const d = new Date(iso)
  const days = Math.round((Date.now() - d.getTime()) / 86_400_000)
  if (days <= 0) return 'Updated today'
  if (days === 1) return 'Updated yesterday'
  if (days < 30) return `Updated ${days} days ago`
  return `Updated ${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
}

export default function EsignTemplatesListPage() {
  const { accountId } = useParams<{ accountId: string }>()
  const navigate = useNavigate()
  const { getToken } = useAuth()
  const { error: showError, success: showSuccess } = useToast()
  const token = getToken()
  const base = `/account/${accountId}/settings/esign/templates`

  const [templates, setTemplates] = useState<EsignTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [pendingDelete, setPendingDelete] = useState<EsignTemplate | null>(null)
  const [busyId, setBusyId] = useState<number | null>(null)

  const load = useCallback(async () => {
    if (!token) return
    setLoading(true)
    try {
      setTemplates(await esignApi.listTemplates(token))
    } catch (e) {
      setTemplates([])
      showError('Could not load templates', e instanceof Error ? e.message : undefined)
    } finally {
      setLoading(false)
    }
  }, [token, showError])

  useEffect(() => {
    void load()
  }, [load])

  const cards = useMemo(() => {
    const q = query.trim().toLowerCase()
    return templates
      .filter(t => !q || t.name.toLowerCase().includes(q) || (t.description ?? '').toLowerCase().includes(q))
      .map(t => {
        const doc = documentFromTemplateRow(t.content_blocks, t.content_html)
        const tags = new Set(JSON.stringify(doc.blocks).match(/\{[a-z_]+\}/g) ?? [])
        return { t, blocks: doc.blocks, tagCount: tags.size }
      })
  }, [templates, query])

  async function confirmDelete() {
    if (!token || !pendingDelete) return
    const id = pendingDelete.id
    setBusyId(id)
    try {
      await esignApi.deleteTemplate(token, id)
      setTemplates(prev => prev.filter(t => t.id !== id))
      showSuccess('Template deleted')
    } catch (e) {
      showError('Delete failed', e instanceof Error ? e.message : undefined)
    } finally {
      setBusyId(null)
      setPendingDelete(null)
    }
  }

  async function duplicate(t: EsignTemplate) {
    if (!token) return
    setBusyId(t.id)
    try {
      const copy = await esignApi.createTemplate(token, {
        name: `${t.name} (copy)`,
        description: t.description ?? undefined,
        content_blocks: documentFromTemplateRow(t.content_blocks, t.content_html),
      })
      showSuccess('Template duplicated', copy.name)
      navigate(`${base}/${copy.id}/edit`)
    } catch (e) {
      showError('Duplicate failed', e instanceof Error ? e.message : undefined)
    } finally {
      setBusyId(null)
    }
  }

  if (!token) return null

  return (
    <div className="esign-page-pro esign-templates-page">
      <div className="tpl-list-toolbar">
        <div className="tpl-list-intro">
          <h2>Document templates</h2>
          <p>
            Reusable offer letters, NDAs and agreements. Merge tags like <code>{'{candidate_name}'}</code> fill in for each
            candidate when a document is sent for signature.
          </p>
        </div>
        <Link to={`${base}/new`} className="btn-primary btn-primary--inline">
          <Icon name="plus" size={16} strokeWidth={2.2} /> New template
        </Link>
      </div>

      {templates.length > 3 ? (
        <label className="tpl-list-search">
          <Icon name="search" size={16} />
          <input type="search" placeholder="Search templates…" value={query} onChange={e => setQuery(e.target.value)} />
        </label>
      ) : null}

      {loading ? (
        <div className="tpl-grid">
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="nx-skeleton tpl-card-skeleton" />
          ))}
        </div>
      ) : templates.length === 0 ? (
        <div className="tpl-list-empty">
          <EmptyState
            icon="esign"
            size={96}
            title="No templates yet"
            text="Start from an offer letter, NDA or blank page — you can add merge tags and preview with sample data."
            actions={
              <Link to={`${base}/new`} className="btn-primary btn-primary--inline">
                <Icon name="plus" size={16} strokeWidth={2.2} /> Create your first template
              </Link>
            }
          />
        </div>
      ) : (
        <div className="tpl-grid">
          <Link to={`${base}/new`} className="tpl-card tpl-card--new">
            <span className="tpl-card-new-icon">
              <Icon name="plus" size={22} strokeWidth={2} />
            </span>
            <span className="tpl-card-new-title">New template</span>
            <span className="tpl-card-new-sub">Start blank or from a starter</span>
          </Link>
          {cards.map(({ t, blocks, tagCount }) => (
            <article key={t.id} className={`tpl-card${busyId === t.id ? ' is-busy' : ''}`}>
              <Link to={`${base}/${t.id}/edit`} className="tpl-card-preview" aria-label={`Edit ${t.name}`}>
                <MiniPage blocks={blocks} />
              </Link>
              <div className="tpl-card-body">
                <Link to={`${base}/${t.id}/edit`} className="tpl-card-name">
                  {t.name}
                </Link>
                <p className="tpl-card-desc">{t.description || 'No internal note'}</p>
                <div className="tpl-card-meta">
                  <span>
                    <Icon name="section" size={13} /> {blocks.length} blocks
                  </span>
                  <span>
                    <Icon name="braces" size={13} /> {tagCount} tags
                  </span>
                  <span className="tpl-card-date">{relativeDate(t.updated_at)}</span>
                </div>
              </div>
              <div className="tpl-card-actions">
                <Link to={`${base}/${t.id}/edit`} className="tpl-card-btn">
                  <Icon name="edit" size={14} /> Edit
                </Link>
                <button type="button" className="tpl-card-btn" onClick={() => void duplicate(t)} disabled={busyId === t.id}>
                  <Icon name="copy" size={14} /> Duplicate
                </button>
                <button
                  type="button"
                  className="tpl-card-btn tpl-card-btn--danger"
                  onClick={() => setPendingDelete(t)}
                  disabled={busyId === t.id}
                  aria-label={`Delete ${t.name}`}
                  title="Delete"
                >
                  <Icon name="trash" size={14} />
                </button>
              </div>
            </article>
          ))}
          {cards.length === 0 ? <p className="tpl-list-nomatch">No templates match “{query}”.</p> : null}
        </div>
      )}

      {pendingDelete ? (
        <div className="confirm-overlay" onClick={() => setPendingDelete(null)}>
          <div className="confirm-dialog" role="alertdialog" aria-modal="true" onClick={e => e.stopPropagation()}>
            <div className="confirm-icon">
              <Icon name="trash" size={22} />
            </div>
            <div className="confirm-title">Delete “{pendingDelete.name}”?</div>
            <div className="confirm-message">Automation rules that send this template may stop working. This can’t be undone.</div>
            <div className="confirm-actions">
              <button type="button" className="btn-confirm-cancel" onClick={() => setPendingDelete(null)}>
                Cancel
              </button>
              <button type="button" className="btn-confirm-danger" onClick={() => void confirmDelete()} disabled={busyId === pendingDelete.id}>
                {busyId === pendingDelete.id ? 'Deleting…' : 'Delete template'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
