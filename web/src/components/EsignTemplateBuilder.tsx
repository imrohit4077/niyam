import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useDroppable,
  useDraggable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Icon, Icon3D, type IconName } from '../icons'
import {
  type BlockType,
  type ButtonBlock,
  type SectionBlock,
  type TemplateBlock,
  type TemplateDocument,
  type TextBlock,
  createBlock,
  duplicateBlock,
  patchBlock,
  removeBlock,
} from '../esign/templateDocument'

/* ── Block catalogue ───────────────────────────────────────────────── */

const BLOCKS: { type: BlockType; label: string; hint: string; icon: IconName }[] = [
  { type: 'text', label: 'Text', hint: 'Paragraph with merge tags', icon: 'text' },
  { type: 'section', label: 'Section', hint: 'Titled content card', icon: 'section' },
  { type: 'image', label: 'Image', hint: 'Logo or banner', icon: 'image' },
  { type: 'button', label: 'Button', hint: 'Call to action', icon: 'button' },
  { type: 'divider', label: 'Divider', hint: 'Separate content', icon: 'divider' },
  { type: 'spacer', label: 'Spacer', hint: 'Vertical room', icon: 'spacer' },
]
const BLOCK_META = Object.fromEntries(BLOCKS.map(b => [b.type, b])) as Record<BlockType, (typeof BLOCKS)[number]>

const FW_MAP: Record<NonNullable<TextBlock['fontWeight']>, number> = {
  normal: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
}

const BTN_PRESETS: { name: string; bg: string; fg: string; r: number }[] = [
  { name: 'Brand', bg: '#4157ff', fg: '#ffffff', r: 10 },
  { name: 'Ink', bg: '#12162b', fg: '#ffffff', r: 10 },
  { name: 'Success', bg: '#16a974', fg: '#ffffff', r: 10 },
  { name: 'Soft', bg: '#eef1ff', fg: '#3443d8', r: 12 },
  { name: 'Pill', bg: '#4157ff', fg: '#ffffff', r: 999 },
]

const ZOOMS = [75, 90, 100, 110] as const
type Zoom = (typeof ZOOMS)[number]

const TOKEN_RE = /(\{[a-z_]+\})/g
const IS_TOKEN = /^\{[a-z_]+\}$/

/** Text with merge tags rendered as chips (edit) or filled with sample values (preview). */
function MergeText({ text, sample }: { text: string; sample?: Record<string, string> }) {
  const parts = text.split(TOKEN_RE)
  return (
    <>
      {parts.map((part, i) => {
        if (!IS_TOKEN.test(part)) return part
        const key = part.slice(1, -1)
        if (sample && sample[key]) return <span key={i}>{sample[key]}</span>
        return (
          <span key={i} className={`tpl-merge${sample ? ' tpl-merge--missing' : ''}`}>
            {part}
          </span>
        )
      })}
    </>
  )
}

/** Full-fidelity rendering of one block on the paper. */
function BlockView({ block: b, sample, editing }: { block: TemplateBlock; sample?: Record<string, string>; editing: boolean }) {
  switch (b.type) {
    case 'text':
      return (
        <div
          className="tpl-text"
          style={{ fontSize: b.fontSize, color: b.color, textAlign: b.align, fontWeight: FW_MAP[b.fontWeight] ?? 400 }}
        >
          {b.content.trim() ? <MergeText text={b.content} sample={sample} /> : editing ? <span className="tpl-placeholder">Empty text block</span> : null}
        </div>
      )
    case 'image':
      return b.src ? (
        <div className="tpl-image">
          <img src={b.src} alt={b.alt} style={{ width: `${b.widthPct}%` }} />
        </div>
      ) : editing ? (
        <div className="tpl-image-empty">
          <Icon name="image" size={22} />
          <span>Add an image URL in the inspector</span>
        </div>
      ) : null
    case 'section':
      return (
        <div className={`tpl-section tpl-section--${b.variant}`}>
          {b.title ? (
            <div className="tpl-section-title">
              <MergeText text={b.title} sample={sample} />
            </div>
          ) : null}
          <div className="tpl-section-body" style={{ fontSize: b.bodyFontSize, color: b.bodyColor, textAlign: b.bodyAlign }}>
            <MergeText text={b.content} sample={sample} />
          </div>
        </div>
      )
    case 'button':
      return (
        <div style={{ textAlign: b.align }}>
          <span className="tpl-button" style={{ background: b.bgColor, color: b.textColor, borderRadius: b.borderRadius }}>
            <MergeText text={b.label} sample={sample} />
          </span>
        </div>
      )
    case 'divider':
      return <hr className={`tpl-divider tpl-divider--${b.style}`} />
    case 'spacer':
      return (
        <div className={editing ? 'tpl-spacer tpl-spacer--edit' : 'tpl-spacer'} style={{ height: b.height }}>
          {editing ? <span>{b.height}px space</span> : null}
        </div>
      )
    default:
      return null
  }
}

/* ── Drag sources & targets ───────────────────────────────────────── */

function LibraryTile({ type, onInsert }: { type: BlockType; onInsert: (t: BlockType) => void }) {
  const meta = BLOCK_META[type]
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `palette-${type}`,
    data: { source: 'palette' as const, blockType: type },
  })
  return (
    <button
      type="button"
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`tpl-tile${isDragging ? ' is-dragging' : ''}`}
      onClick={() => onInsert(type)}
      title={`${meta.label} — click to insert, or drag onto the page`}
    >
      <span className="tpl-tile-icon">
        <Icon name={meta.icon} size={18} />
      </span>
      <span className="tpl-tile-label">{meta.label}</span>
      <span className="tpl-tile-hint">{meta.hint}</span>
    </button>
  )
}

function PaperDropZone({ children, onBackgroundClick }: { children: ReactNode; onBackgroundClick: () => void }) {
  const { setNodeRef, isOver } = useDroppable({ id: 'canvas-root' })
  return (
    <div ref={setNodeRef} className={`tpl-paper-body${isOver ? ' is-over' : ''}`} onClick={onBackgroundClick} role="presentation">
      {children}
    </div>
  )
}

function SortableBlock({
  block,
  index,
  total,
  selected,
  onSelect,
  onFocusInspector,
  onMove,
  onDuplicate,
  onDelete,
}: {
  block: TemplateBlock
  index: number
  total: number
  selected: boolean
  onSelect: () => void
  onFocusInspector: () => void
  onMove: (dir: -1 | 1) => void
  onDuplicate: () => void
  onDelete: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: block.id })
  const meta = BLOCK_META[block.type]
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`tpl-block${selected ? ' is-selected' : ''}${isDragging ? ' is-dragging' : ''}`}
      onClick={e => {
        e.stopPropagation()
        onSelect()
      }}
      onDoubleClick={e => {
        e.stopPropagation()
        onFocusInspector()
      }}
      role="button"
      tabIndex={0}
      aria-label={`${meta.label} block`}
      onKeyDown={e => {
        if (e.key === 'Enter') {
          e.preventDefault()
          onFocusInspector()
        }
      }}
    >
      <button type="button" className="tpl-block-grip" aria-label="Drag to reorder" {...attributes} {...listeners}>
        <Icon name="drag" size={14} />
      </button>
      <span className="tpl-block-tag">
        <Icon name={meta.icon} size={11} /> {meta.label}
      </span>
      {selected ? (
        <div className="tpl-block-toolbar" onClick={e => e.stopPropagation()}>
          <button type="button" title="Move up (Alt+↑)" disabled={index === 0} onClick={() => onMove(-1)}>
            <Icon name="chevronUp" size={15} />
          </button>
          <button type="button" title="Move down (Alt+↓)" disabled={index === total - 1} onClick={() => onMove(1)}>
            <Icon name="chevronDown" size={15} />
          </button>
          <button type="button" title="Duplicate (Ctrl+D)" onClick={onDuplicate}>
            <Icon name="copy" size={14} />
          </button>
          <button type="button" title="Delete (Del)" className="is-danger" onClick={onDelete}>
            <Icon name="trash" size={14} />
          </button>
        </div>
      ) : null}
      <BlockView block={block} editing />
    </div>
  )
}

/* ── Inspector ────────────────────────────────────────────────────── */

type MergeChip = { token: string; label: string }

function AlignSeg({ value, onChange }: { value: 'left' | 'center' | 'right'; onChange: (v: 'left' | 'center' | 'right') => void }) {
  const opts = [
    { v: 'left', icon: 'alignLeft' },
    { v: 'center', icon: 'alignCenter' },
    { v: 'right', icon: 'alignRight' },
  ] as const
  return (
    <div className="tpl-seg" role="group" aria-label="Alignment">
      {opts.map(o => (
        <button
          key={o.v}
          type="button"
          className={value === o.v ? 'is-active' : ''}
          onClick={() => onChange(o.v)}
          aria-pressed={value === o.v}
          title={o.v}
        >
          <Icon name={o.icon} size={15} />
        </button>
      ))}
    </div>
  )
}

function ColorField({ label, value, fallback, onChange }: { label: string; value: string; fallback: string; onChange: (v: string) => void }) {
  const safe = /^#[0-9a-f]{6}$/i.test(value) ? value : fallback
  return (
    <label className="tpl-color">
      <span className="tpl-label">{label}</span>
      <span className="tpl-color-control">
        <input type="color" value={safe} onChange={e => onChange(e.target.value)} />
        <code>{safe.toUpperCase()}</code>
      </span>
    </label>
  )
}

type ActiveField = { field: 'content' | 'title' | 'label'; el: HTMLInputElement | HTMLTextAreaElement }

function BlockInspector({
  block,
  onPatch,
  mergeChips,
  onCopyToken,
  focusKey,
}: {
  block: TemplateBlock
  onPatch: (p: Partial<TemplateBlock>) => void
  mergeChips: MergeChip[]
  onCopyToken: (t: string) => void
  focusKey: number
}) {
  const active = useRef<ActiveField | null>(null)
  const primary = useRef<HTMLTextAreaElement | HTMLInputElement | null>(null)
  const [filter, setFilter] = useState('')
  const meta = BLOCK_META[block.type]

  useEffect(() => {
    if (focusKey > 0) primary.current?.focus()
  }, [focusKey])

  const track = (field: ActiveField['field']) => (e: { currentTarget: HTMLInputElement | HTMLTextAreaElement }) => {
    active.current = { field, el: e.currentTarget }
  }

  const insertToken = (token: string) => {
    const a = active.current
    if (!a || !a.el.isConnected) {
      onCopyToken(token)
      return
    }
    const el = a.el
    const start = el.selectionStart ?? el.value.length
    const end = el.selectionEnd ?? start
    onPatch({ [a.field]: el.value.slice(0, start) + token + el.value.slice(end) } as Partial<TemplateBlock>)
    requestAnimationFrame(() => {
      el.focus()
      const pos = start + token.length
      el.setSelectionRange(pos, pos)
    })
  }

  const chips = useMemo(() => {
    const q = filter.trim().toLowerCase()
    return q ? mergeChips.filter(c => c.label.toLowerCase().includes(q) || c.token.includes(q)) : mergeChips
  }, [mergeChips, filter])

  const hasTextField = block.type === 'text' || block.type === 'section' || block.type === 'button'

  return (
    <div className="tpl-inspector">
      <div className="tpl-inspector-head">
        <span className="tpl-inspector-icon">
          <Icon name={meta.icon} size={18} />
        </span>
        <div>
          <p className="tpl-inspector-title">{meta.label} block</p>
          <p className="tpl-inspector-sub">{meta.hint}</p>
        </div>
      </div>

      <div className="tpl-fields">
        {block.type === 'text' && (
          <>
            <label className="tpl-field">
              <span className="tpl-label">Content</span>
              <textarea
                ref={el => {
                  primary.current = el
                }}
                rows={7}
                value={block.content}
                onFocus={track('content')}
                onSelect={track('content')}
                onChange={e => onPatch({ content: e.target.value })}
              />
            </label>
            <div className="tpl-row">
              <label className="tpl-field">
                <span className="tpl-label">Size</span>
                <input
                  type="number"
                  min={10}
                  max={36}
                  value={block.fontSize}
                  onChange={e => onPatch({ fontSize: Number(e.target.value) || 15 })}
                />
              </label>
              <label className="tpl-field">
                <span className="tpl-label">Weight</span>
                <select value={block.fontWeight} onChange={e => onPatch({ fontWeight: e.target.value as TextBlock['fontWeight'] })}>
                  <option value="normal">Regular</option>
                  <option value="medium">Medium</option>
                  <option value="semibold">Semibold</option>
                  <option value="bold">Bold</option>
                </select>
              </label>
            </div>
            <div className="tpl-row">
              <ColorField label="Color" value={block.color} fallback="#111827" onChange={v => onPatch({ color: v })} />
              <div className="tpl-field">
                <span className="tpl-label">Align</span>
                <AlignSeg value={block.align} onChange={v => onPatch({ align: v })} />
              </div>
            </div>
          </>
        )}

        {block.type === 'image' && (
          <>
            <label className="tpl-field">
              <span className="tpl-label">Image URL</span>
              <input
                ref={el => {
                  primary.current = el
                }}
                value={block.src}
                onChange={e => onPatch({ src: e.target.value })}
                placeholder="https://…/logo.png"
              />
            </label>
            <label className="tpl-field">
              <span className="tpl-label">Alt text</span>
              <input value={block.alt} onChange={e => onPatch({ alt: e.target.value })} />
            </label>
            <label className="tpl-field">
              <span className="tpl-label">
                Width <em>{block.widthPct}%</em>
              </span>
              <input type="range" min={20} max={100} value={block.widthPct} onChange={e => onPatch({ widthPct: Number(e.target.value) })} />
            </label>
          </>
        )}

        {block.type === 'section' && (
          <>
            <div className="tpl-field">
              <span className="tpl-label">Style</span>
              <div className="tpl-variant">
                {(['card', 'minimal', 'highlight'] as const).map(v => (
                  <button
                    key={v}
                    type="button"
                    className={block.variant === v ? 'is-active' : ''}
                    onClick={() => onPatch({ variant: v as SectionBlock['variant'] })}
                  >
                    <span className={`tpl-variant-swatch tpl-variant-swatch--${v}`} />
                    {v === 'card' ? 'Card' : v === 'minimal' ? 'Minimal' : 'Accent'}
                  </button>
                ))}
              </div>
            </div>
            <label className="tpl-field">
              <span className="tpl-label">Title</span>
              <input value={block.title} onFocus={track('title')} onSelect={track('title')} onChange={e => onPatch({ title: e.target.value })} />
            </label>
            <label className="tpl-field">
              <span className="tpl-label">Body</span>
              <textarea
                ref={el => {
                  primary.current = el
                }}
                rows={6}
                value={block.content}
                onFocus={track('content')}
                onSelect={track('content')}
                onChange={e => onPatch({ content: e.target.value })}
              />
            </label>
            <div className="tpl-row">
              <label className="tpl-field">
                <span className="tpl-label">Body size</span>
                <input
                  type="number"
                  min={10}
                  max={22}
                  value={block.bodyFontSize}
                  onChange={e => onPatch({ bodyFontSize: Number(e.target.value) || 14 })}
                />
              </label>
              <ColorField label="Body color" value={block.bodyColor} fallback="#374151" onChange={v => onPatch({ bodyColor: v })} />
            </div>
            <div className="tpl-field">
              <span className="tpl-label">Body align</span>
              <AlignSeg value={block.bodyAlign} onChange={v => onPatch({ bodyAlign: v })} />
            </div>
          </>
        )}

        {block.type === 'button' && (
          <>
            <div className="tpl-field">
              <span className="tpl-label">Style</span>
              <div className="tpl-presets">
                {BTN_PRESETS.map(p => (
                  <button
                    key={p.name}
                    type="button"
                    style={{ background: p.bg, color: p.fg, borderRadius: Math.min(p.r, 10) }}
                    onClick={() => onPatch({ bgColor: p.bg, textColor: p.fg, borderRadius: p.r })}
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            </div>
            <label className="tpl-field">
              <span className="tpl-label">Label</span>
              <input
                ref={el => {
                  primary.current = el
                }}
                value={block.label}
                onFocus={track('label')}
                onSelect={track('label')}
                onChange={e => onPatch({ label: e.target.value })}
              />
            </label>
            <label className="tpl-field">
              <span className="tpl-label">Link</span>
              <input value={block.href} onChange={e => onPatch({ href: e.target.value })} placeholder="https://…" />
            </label>
            <div className="tpl-row">
              <ColorField label="Background" value={block.bgColor} fallback="#4157ff" onChange={v => onPatch({ bgColor: v })} />
              <ColorField label="Text" value={block.textColor} fallback="#ffffff" onChange={v => onPatch({ textColor: v })} />
            </div>
            <div className="tpl-row">
              <label className="tpl-field">
                <span className="tpl-label">Radius</span>
                <input
                  type="number"
                  min={0}
                  max={999}
                  value={block.borderRadius}
                  onChange={e => onPatch({ borderRadius: Number(e.target.value) || 0 })}
                />
              </label>
              <div className="tpl-field">
                <span className="tpl-label">Align</span>
                <AlignSeg value={block.align} onChange={v => onPatch({ align: v as ButtonBlock['align'] })} />
              </div>
            </div>
          </>
        )}

        {block.type === 'divider' && (
          <div className="tpl-field">
            <span className="tpl-label">Line style</span>
            <div className="tpl-variant">
              {(['solid', 'dashed', 'subtle'] as const).map(v => (
                <button key={v} type="button" className={block.style === v ? 'is-active' : ''} onClick={() => onPatch({ style: v })}>
                  <span className={`tpl-line-swatch tpl-line-swatch--${v}`} />
                  {v === 'subtle' ? 'Fade' : v.charAt(0).toUpperCase() + v.slice(1)}
                </button>
              ))}
            </div>
          </div>
        )}

        {block.type === 'spacer' && (
          <label className="tpl-field">
            <span className="tpl-label">
              Height <em>{block.height}px</em>
            </span>
            <input type="range" min={8} max={120} value={block.height} onChange={e => onPatch({ height: Number(e.target.value) })} />
          </label>
        )}
      </div>

      {hasTextField ? (
        <div className="tpl-merge-panel">
          <div className="tpl-merge-head">
            <span className="tpl-label">
              <Icon name="braces" size={14} /> Merge tags
            </span>
            <span className="tpl-merge-hint">Click to insert at cursor</span>
          </div>
          <input
            type="search"
            className="tpl-merge-search"
            placeholder="Filter tags…"
            value={filter}
            onChange={e => setFilter(e.target.value)}
          />
          <div className="tpl-merge-list">
            {chips.map(c => (
              <button
                key={c.token}
                type="button"
                className="tpl-merge-chip"
                onMouseDown={e => e.preventDefault()}
                onClick={() => insertToken(c.token)}
              >
                <span>{c.label}</span>
                <code>{c.token}</code>
              </button>
            ))}
            {chips.length === 0 ? <p className="tpl-merge-empty">No tags match “{filter}”.</p> : null}
          </div>
        </div>
      ) : null}
    </div>
  )
}

/* ── Builder ──────────────────────────────────────────────────────── */

export type EsignTemplateBuilderProps = {
  document: TemplateDocument
  onDocumentChange: (d: TemplateDocument) => void
  selectedId: string | null
  onSelectId: (id: string | null) => void
  mergeChips: MergeChip[]
  onCopyToken: (t: string) => void
  /** Extra tokens, e.g. "{department} · {location}" — offered alongside `mergeChips`. */
  morePlaceholders: string
  /** 'preview' fills merge tags with `sampleData` and hides editing chrome. */
  mode?: 'edit' | 'preview'
  sampleData?: Record<string, string>
  /** Shown in the inspector when no block is selected (template name, notes…). */
  detailsPanel?: ReactNode
  /** Heading shown at the top of the paper (usually the template name). */
  paperTitle?: string
}

function tokenLabel(token: string) {
  const s = token.replace(/[{}]/g, '').replace(/_/g, ' ')
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export function EsignTemplateBuilder({
  document: doc,
  onDocumentChange,
  selectedId,
  onSelectId,
  mergeChips,
  onCopyToken,
  morePlaceholders,
  mode = 'edit',
  sampleData,
  detailsPanel,
  paperTitle,
}: EsignTemplateBuilderProps) {
  const [overlayType, setOverlayType] = useState<BlockType | null>(null)
  const [zoom, setZoom] = useState<Zoom>(100)
  const [focusKey, setFocusKey] = useState(0)
  const [addOpen, setAddOpen] = useState(false)
  const editing = mode === 'edit'
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }), useSensor(KeyboardSensor))

  const ids = useMemo(() => doc.blocks.map(b => b.id), [doc.blocks])
  const selected = useMemo(() => doc.blocks.find(b => b.id === selectedId) ?? null, [doc, selectedId])

  const allChips = useMemo(() => {
    const seen = new Set(mergeChips.map(c => c.token))
    const extra = (morePlaceholders.match(TOKEN_RE) ?? [])
      .filter(t => !seen.has(t))
      .map(t => ({ token: t, label: tokenLabel(t) }))
    return [...mergeChips, ...extra]
  }, [mergeChips, morePlaceholders])

  const insertBlock = useCallback(
    (type: BlockType, at?: number) => {
      const nb = createBlock(type)
      const next = [...doc.blocks]
      const selIdx = selectedId ? next.findIndex(b => b.id === selectedId) : -1
      const pos = at ?? (selIdx >= 0 ? selIdx + 1 : next.length)
      next.splice(pos, 0, nb)
      onDocumentChange({ ...doc, blocks: next })
      onSelectId(nb.id)
      setAddOpen(false)
    },
    [doc, selectedId, onDocumentChange, onSelectId],
  )

  const move = useCallback(
    (id: string, dir: -1 | 1) => {
      const i = doc.blocks.findIndex(b => b.id === id)
      const j = i + dir
      if (i < 0 || j < 0 || j >= doc.blocks.length) return
      onDocumentChange({ ...doc, blocks: arrayMove(doc.blocks, i, j) })
    },
    [doc, onDocumentChange],
  )

  const duplicate = useCallback(
    (id: string) => {
      const next = duplicateBlock(doc, id)
      onDocumentChange(next)
      const idx = doc.blocks.findIndex(b => b.id === id)
      const nb = next.blocks[idx + 1]
      if (nb) onSelectId(nb.id)
    },
    [doc, onDocumentChange, onSelectId],
  )

  const remove = useCallback(
    (id: string) => {
      const idx = doc.blocks.findIndex(b => b.id === id)
      const next = removeBlock(doc, id)
      onDocumentChange(next)
      const neighbour = next.blocks[Math.min(idx, next.blocks.length - 1)]
      onSelectId(neighbour ? neighbour.id : null)
    },
    [doc, onDocumentChange, onSelectId],
  )

  useEffect(() => {
    if (!editing) return
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null
      if (t && (t.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName))) return
      if (!selectedId) return
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault()
        remove(selectedId)
      } else if (e.key.toLowerCase() === 'd' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        duplicate(selectedId)
      } else if (e.altKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
        e.preventDefault()
        move(selectedId, e.key === 'ArrowUp' ? -1 : 1)
      } else if (e.key === 'Escape') {
        onSelectId(null)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [editing, selectedId, remove, duplicate, move, onSelectId])

  const onDragStart = useCallback((e: DragStartEvent) => {
    const t = e.active.data.current?.blockType as BlockType | undefined
    if (String(e.active.id).startsWith('palette-') && t) setOverlayType(t)
  }, [])

  const onDragEnd = useCallback(
    (event: DragEndEvent) => {
      setOverlayType(null)
      const { active, over } = event
      if (!over) return
      const aid = String(active.id)
      if (aid.startsWith('palette-')) {
        const type = active.data.current?.blockType as BlockType | undefined
        if (!type) return
        const overId = String(over.id)
        const idx = doc.blocks.findIndex(b => b.id === overId)
        insertBlock(type, overId === 'canvas-root' || idx < 0 ? doc.blocks.length : idx)
        return
      }
      if (active.id !== over.id) {
        const oldIndex = doc.blocks.findIndex(b => b.id === active.id)
        const newIndex = doc.blocks.findIndex(b => b.id === over.id)
        if (oldIndex >= 0 && newIndex >= 0) onDocumentChange({ ...doc, blocks: arrayMove(doc.blocks, oldIndex, newIndex) })
      }
    },
    [doc, insertBlock, onDocumentChange],
  )

  const zoomIdx = ZOOMS.indexOf(zoom)

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={onDragStart} onDragEnd={onDragEnd}>
      <div className={`tpl-studio-grid${editing ? '' : ' tpl-studio-grid--preview'}`}>
        {editing ? (
          <aside className="tpl-panel tpl-panel--library" aria-label="Block library">
            <div className="tpl-panel-head">
              <h3>Blocks</h3>
              <p>Click to insert below the selection, or drag onto the page.</p>
            </div>
            <div className="tpl-tiles">
              {BLOCKS.map(b => (
                <LibraryTile key={b.type} type={b.type} onInsert={t => insertBlock(t)} />
              ))}
            </div>

            <div className="tpl-panel-head tpl-panel-head--sub">
              <h3>
                <Icon name="layers" size={14} /> Outline
              </h3>
              <span className="tpl-count">{doc.blocks.length}</span>
            </div>
            <ol className="tpl-outline">
              {doc.blocks.map((b, i) => {
                const meta = BLOCK_META[b.type]
                const snippet =
                  b.type === 'text'
                    ? b.content
                    : b.type === 'section'
                      ? b.title || b.content
                      : b.type === 'button'
                        ? b.label
                        : b.type === 'image'
                          ? b.alt || 'Image'
                          : b.type === 'spacer'
                            ? `${b.height}px`
                            : b.style
                return (
                  <li key={b.id}>
                    <button
                      type="button"
                      className={b.id === selectedId ? 'is-active' : ''}
                      onClick={() => onSelectId(b.id)}
                    >
                      <span className="tpl-outline-idx">{i + 1}</span>
                      <Icon name={meta.icon} size={14} />
                      <span className="tpl-outline-text">{snippet || meta.label}</span>
                    </button>
                  </li>
                )
              })}
            </ol>
          </aside>
        ) : null}

        <section className="tpl-canvas" aria-label="Document canvas">
          <div className="tpl-canvas-bar">
            <span className="tpl-canvas-meta">
              {editing ? (
                <>
                  <Icon name="applications" size={14} /> {doc.blocks.length} block{doc.blocks.length === 1 ? '' : 's'}
                </>
              ) : (
                <>
                  <Icon name="eye" size={14} /> Preview with sample candidate data
                </>
              )}
            </span>
            <div className="tpl-zoom" role="group" aria-label="Zoom">
              <button type="button" onClick={() => setZoom(ZOOMS[Math.max(0, zoomIdx - 1)])} disabled={zoomIdx === 0} aria-label="Zoom out">
                <Icon name="zoomOut" size={15} />
              </button>
              <span>{zoom}%</span>
              <button
                type="button"
                onClick={() => setZoom(ZOOMS[Math.min(ZOOMS.length - 1, zoomIdx + 1)])}
                disabled={zoomIdx === ZOOMS.length - 1}
                aria-label="Zoom in"
              >
                <Icon name="zoomIn" size={15} />
              </button>
            </div>
          </div>

          <div className="tpl-canvas-scroll" onClick={() => editing && onSelectId(null)}>
            <article className="tpl-paper" style={{ zoom: zoom / 100 }} onClick={e => e.stopPropagation()}>
              <div className="tpl-paper-letterhead" aria-hidden>
                <span className="tpl-paper-logo" />
                <span className="tpl-paper-doc">{paperTitle || 'Untitled document'}</span>
              </div>
              {editing ? (
                <PaperDropZone onBackgroundClick={() => onSelectId(null)}>
                  <SortableContext items={ids} strategy={verticalListSortingStrategy}>
                    {doc.blocks.length === 0 ? (
                      <div className="tpl-paper-empty">
                        <Icon3D name="applications" size={72} />
                        <p className="tpl-paper-empty-title">This page is empty</p>
                        <p>Click a block on the left or drag it here to start writing.</p>
                      </div>
                    ) : (
                      doc.blocks.map((b, i) => (
                        <SortableBlock
                          key={b.id}
                          block={b}
                          index={i}
                          total={doc.blocks.length}
                          selected={b.id === selectedId}
                          onSelect={() => onSelectId(b.id)}
                          onFocusInspector={() => {
                            onSelectId(b.id)
                            setFocusKey(k => k + 1)
                          }}
                          onMove={dir => move(b.id, dir)}
                          onDuplicate={() => duplicate(b.id)}
                          onDelete={() => remove(b.id)}
                        />
                      ))
                    )}
                  </SortableContext>
                  <div className="tpl-add" onClick={e => e.stopPropagation()}>
                    <button type="button" className="tpl-add-btn" onClick={() => setAddOpen(o => !o)} aria-expanded={addOpen}>
                      <Icon name="plus" size={15} strokeWidth={2.2} /> Add block
                    </button>
                    {addOpen ? (
                      <div className="tpl-add-menu" role="menu">
                        {BLOCKS.map(b => (
                          <button key={b.type} type="button" role="menuitem" onClick={() => insertBlock(b.type, doc.blocks.length)}>
                            <Icon name={b.icon} size={15} /> {b.label}
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </PaperDropZone>
              ) : (
                <div className="tpl-paper-body tpl-paper-body--preview">
                  {doc.blocks.map(b => (
                    <div key={b.id} className="tpl-preview-block">
                      <BlockView block={b} sample={sampleData} editing={false} />
                    </div>
                  ))}
                </div>
              )}
              <div className="tpl-paper-sign" aria-hidden>
                <span className="tpl-paper-sign-line" />
                <span>Candidate signature</span>
              </div>
            </article>
          </div>

          {editing ? (
            <p className="tpl-shortcuts">
              <kbd>Dbl-click</kbd> edit · <kbd>Alt</kbd>+<kbd>↑↓</kbd> move · <kbd>Ctrl</kbd>+<kbd>D</kbd> duplicate ·{' '}
              <kbd>Del</kbd> remove · <kbd>Esc</kbd> deselect
            </p>
          ) : null}
        </section>

        {editing ? (
          <aside className="tpl-panel tpl-panel--inspector" aria-label="Inspector">
            {selected ? (
              <BlockInspector
                key={selected.id}
                block={selected}
                onPatch={p => onDocumentChange(patchBlock(doc, selected.id, p))}
                mergeChips={allChips}
                onCopyToken={onCopyToken}
                focusKey={focusKey}
              />
            ) : (
              detailsPanel
            )}
          </aside>
        ) : null}
      </div>

      <DragOverlay dropAnimation={null}>
        {overlayType ? (
          <div className="tpl-drag-ghost">
            <Icon name={BLOCK_META[overlayType].icon} size={16} />
            {BLOCK_META[overlayType].label}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}
