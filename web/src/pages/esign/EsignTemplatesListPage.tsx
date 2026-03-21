import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'
import { esignApi, type EsignTemplate } from '../../api/esign'
import { useToast } from '../../contexts/ToastContext'

export default function EsignTemplatesListPage() {
  const { accountId } = useParams<{ accountId: string }>()
  const { getToken } = useAuth()
  const { error: showError, success: showSuccess } = useToast()
  const token = getToken()
  const base = `/account/${accountId}/settings/esign/templates`

  const [templates, setTemplates] = useState<EsignTemplate[]>([])
  const [loading, setLoading] = useState(true)

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

  async function remove(id: number) {
    if (!token || !confirm('Delete this template? Automation rules that use it may stop working.')) return
    try {
      await esignApi.deleteTemplate(token, id)
      setTemplates(prev => prev.filter(t => t.id !== id))
      showSuccess('Template deleted')
    } catch (e) {
      showError('Delete failed', e instanceof Error ? e.message : undefined)
    }
  }

  if (!token) return null

  return (
    <div className="esign-page-pro esign-templates-page">
      <div className="esign-templates-toolbar">
        <p className="esign-templates-lead">
          Reusable documents for e-signing. Each template is built from blocks; the server turns them into HTML for
          candidates. Use merge tags in text blocks for names, roles, and dates.
        </p>
        <Link to={`${base}/new`} className="btn-primary btn-primary--inline">
          <span aria-hidden>+</span> New template
        </Link>
      </div>

      {loading ? (
        <div className="esign-pro-loading">Loading…</div>
      ) : templates.length === 0 ? (
        <div className="esign-templates-empty">
          <p>No templates yet</p>
          <Link to={`${base}/new`} className="btn-primary btn-primary--inline">
            Create your first template
          </Link>
          <p className="esign-templates-empty-foot">
            Or run <code className="esign-pro-code">python manage.py db seed</code> for sample templates.
          </p>
        </div>
      ) : (
        <div className="esign-templates-list-card">
          <table className="esign-pro-table esign-templates-table">
            <thead>
              <tr>
                <th scope="col">Name</th>
                <th scope="col">Description</th>
                <th scope="col">Updated</th>
                <th scope="col" className="esign-pro-table-actions">
                  <span className="visually-hidden">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {templates.map(t => (
                <tr key={t.id}>
                  <td>
                    <Link to={`${base}/${t.id}/edit`} className="esign-templates-name-link">
                      {t.name}
                    </Link>
                  </td>
                  <td className="esign-pro-table-muted">{t.description || '—'}</td>
                  <td className="esign-pro-table-muted">
                    {t.updated_at ? new Date(t.updated_at).toLocaleDateString() : '—'}
                  </td>
                  <td className="esign-pro-table-actions">
                    <div className="esign-templates-actions">
                      <Link to={`${base}/${t.id}/edit`} className="esign-pro-link">
                        Edit
                      </Link>
                      <button type="button" className="esign-pro-link danger" onClick={() => void remove(t.id)}>
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
