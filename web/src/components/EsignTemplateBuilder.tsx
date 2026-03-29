import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
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
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
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

const ICONS: Record<BlockType, ReactNode> = {
  text: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M4 7V5h16v2M9 20h6M12 4v16" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  image: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <circle cx="8.5" cy="10" r="1.5" fill="currentColor" stroke="none" />
      <path d="M21 17l-5-5-4 4-3-3-5 5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  section: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <path d="M8 9h8M8 13h5" strokeLinecap="round" />
    </svg>
  ),
  button: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <rect x="4" y="8" width="16" height="8" rx="2" />
      <path d="M9 12h6" strokeLinecap="round" />
    </svg>
  ),
  divider: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M4 12h16" strokeLinecap="round" />
      <path d="M4 6h16M4 18h16" strokeLinecap="round" opacity="0.35" />
    </svg>
  ),
  spacer: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M8 10V6M12 14V4M16 10v8" strokeLinecap="round" />
    </svg>
  ),
}

const PALETTE: { type: BlockType; label: string; hint: string; group: string }[] = [
  { type: 'text', label: 'Text', hint: 'Paragraphs & merge tags', group: 'Content' },
  { type: 'image', label: 'Image', hint: 'Logo or banner URL', group: 'Content' },
  { type: 'section', label: 'Section', hint: 'Titled content block', group: 'Content' },
  { type: 'button', label: 'Button', hint: 'Call-to-action link', group: 'Content' },
  { type: 'divider', label: 'Divider', hint: 'Visual separator', group: 'Layout' },
  { type: 'spacer', label: 'Spacer', hint: 'Vertical breathing room', group: 'Layout' },
]

const FW_MAP: Record<NonNullable<TextBlock['fontWeight']>, number> = {
  normal: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
}

const BTN_PRESETS: { name: string; bg: string; fg: string; r: number }[] = [
  { name: 'Primary', bg: '#0284c7', fg: '#ffffff', r: 8 },
  { name: 'Dark', bg: '#0f172a', fg: '#f8fafc', r: 8 },
  { name: 'Success', bg: '#059669', fg: '#ffffff', r: 8 },
  { name: 'Soft', bg: '#e0f2fe', fg: '#0369a1', r: 10 },
]

function PaletteItem({ type, label }: { type: BlockType; label: string }) {
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
      className={`esign-tpl-palette-item${isDragging ? ' is-dragging' : ''}`}
    >
      <span className="esign-tpl-palette-icon" aria-hidden>
        {ICONS[type]}
      </span>
      <span className="esign-tpl-palette-label">{label}</span>
    </button>
  )
}

function CanvasDropZone({
  children,
  onBackgroundClick,
}: {
  children: ReactNode
  onBackgroundClick: () => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id: 'canvas-root' })
  return (
    <div
      ref={setNodeRef}
      className={`esign-tpl-canvas-inner${isOver ? ' is-over' : ''}`}
      onClick={onBackgroundClick}
      role="presentation"
    >
      {children}
    </div>
  )
}

function SortableCanvasBlock({
  block,
  selected,
  onSelect,
}: {
  block: TemplateBlock
  selected: boolean
  onSelect: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: block.id,
  })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`esign-tpl-block${selected ? ' is-selected' : ''}${isDragging ? ' is-dragging' : ''}`}
      onClick={e => {
        e.stopPropagation()
        onSelect()
      }}
      role="button"
      tabIndex={0}
      onKeyDown={e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onSelect()
        }
      }}
    >
      <button
        type="button"
        className="esign-tpl-block-grip"
        aria-label="Drag to reorder"
        {...attributes}
        {...listeners}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <circle cx="9" cy="8" r="1.5" />
          <circle cx="15" cy="8" r="1.5" />
          <circle cx="9" cy="16" r="1.5" />
          <circle cx="15" cy="16" r="1.5" />
        </svg>
      </button>
      <div className="esign-tpl-block-preview">{blockPreview(block)}</div>
    </div>
  )
}

function blockPreview(b: TemplateBlock): ReactNode {
  switch (b.type) {
    case 'text':
      return (
        <div
          className="esign-tpl-preview-text"
          style={{
            fontSize: Math.min(b.fontSize, 18),
            color: b.color,
            textAlign: b.align,
            fontWeight: FW_MAP[b.fontWeight] ?? 400,
          }}
        >
          {b.content.slice(0, 220)}
          {b.content.length > 220 ? '…' : ''}
        </div>
      )
    case 'image':
      return b.src ? (
        <img className="esign-tpl-preview-img" src={b.src} alt={b.alt} />
      ) : (
        <span className="esign-tpl-preview-placeholder">Drop an image URL in the inspector →</span>
      )
    case 'section':
      return (
        <div
          className={`esign-tpl-preview-section esign-tpl-preview-section--${b.variant}`}
        >
          {b.title && <strong>{b.title}</strong>}
          <div
            style={{
              fontSize: Math.min(b.bodyFontSize, 15),
              color: b.bodyColor,
              textAlign: b.bodyAlign,
            }}
          >
            {b.content.slice(0, 160)}
            {b.content.length > 160 ? '…' : ''}
          </div>
        </div>
      )
    case 'button':
      return (
        <div style={{ textAlign: b.align }}>
          <span
            className="esign-tpl-preview-btn"
            style={{
              background: b.bgColor,
              color: b.textColor,
              borderRadius: b.borderRadius,
            }}
          >
            {b.label}
          </span>
        </div>
      )
    case 'divider':
      return (
        <div className="esign-tpl-preview-divider">
          <span
            className={`esign-tpl-preview-divider-line esign-tpl-preview-divider-line--${b.style}`}
          />
          <span className="esign-tpl-preview-divider-cap">Divider · {b.style}</span>
        </div>
      )
    case 'spacer':
      return (
        <div className="esign-tpl-preview-spacer">
          <span className="esign-tpl-preview-spacer-bar" style={{ height: Math.min(b.height, 48) }} />
          <span className="esign-tpl-preview-spacer-label">{b.height}px vertical space</span>
        </div>
      )
    default:
      return null
  }
}

function AlignSeg({
  value,
  onChange,
}: {
  value: 'left' | 'center' | 'right'
  onChange: (v: 'left' | 'center' | 'right') => void
}) {
  const opts: { v: typeof value; label: string }[] = [
    { v: 'left', label: 'Left' },
    { v: 'center', label: 'Center' },
    { v: 'right', label: 'Right' },
  ]
  return (
    <div className="esign-tpl-seg" role="group" aria-label="Alignment">
      {opts.map(o => (
        <button
          key={o.v}
          type="button"
          className={`esign-tpl-seg-btn${value === o.v ? ' is-active' : ''}`}
          onClick={() => onChange(o.v)}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

function BlockInspector({
  block,
  onPatch,
  mergeChips,
  onCopyToken,
  morePlaceholders,
  mergeFilter,
  onMergeFilterChange,
}: {
  block: TemplateBlock
  onPatch: (p: Partial<TemplateBlock>) => void
  mergeChips: { token: string; label: string }[]
  onCopyToken: (t: string) => void
  morePlaceholders: string
  mergeFilter: string
  onMergeFilterChange: (s: string) => void
}) {
  const filteredChips = useMemo(() => {
    const q = mergeFilter.trim().toLowerCase()
    if (!q) return mergeChips
    return mergeChips.filter(
      c => c.label.toLowerCase().includes(q) || c.token.toLowerCase().includes(q),
    )
  }, [mergeChips, mergeFilter])

  const typeLabel =
    block.type === 'text'
      ? 'Text'
      : block.type === 'image'
        ? 'Image'
        : block.type === 'section'
          ? 'Section'
          : block.type === 'button'
            ? 'Button'
            : block.type === 'divider'
              ? 'Divider'
              : 'Spacer'

  return (
    <div className="esign-tpl-inspector">
      <div className="esign-tpl-inspector-head">
        <span className="esign-tpl-inspector-icon" aria-hidden>
          {ICONS[block.type]}
        </span>
        <div>
          <p className="esign-tpl-inspector-type">{typeLabel}</p>
          <p className="esign-tpl-inspector-sub">Properties & merge tags</p>
        </div>
      </div>

      {block.type === 'text' && (
        <div className="esign-tpl-field-group">
          <label className="esign-tpl-inspector-label">Content</label>
          <textarea
            className="esign-tpl-inspector-textarea"
            rows={8}
            value={block.content}
            onChange={e => onPatch({ content: e.target.value })}
          />
          <div className="esign-tpl-field-row">
            <div>
              <label className="esign-tpl-inspector-label">Size</label>
              <input
                type="number"
                min={10}
                max={36}
                className="esign-tpl-inspector-input"
                value={block.fontSize}
                onChange={e => onPatch({ fontSize: Number(e.target.value) || 15 })}
              />
            </div>
            <div>
              <label className="esign-tpl-inspector-label">Weight</label>
              <select
                className="esign-tpl-inspector-select"
                value={block.fontWeight}
                onChange={e => onPatch({ fontWeight: e.target.value as TextBlock['fontWeight'] })}
              >
                <option value="normal">Regular</option>
                <option value="medium">Medium</option>
                <option value="semibold">Semibold</option>
                <option value="bold">Bold</option>
              </select>
            </div>
          </div>
          <label className="esign-tpl-inspector-label">Text color</label>
          <input
            type="color"
            className="esign-tpl-inspector-color"
            value={block.color.length === 7 ? block.color : '#111827'}
            onChange={e => onPatch({ color: e.target.value })}
          />
          <label className="esign-tpl-inspector-label">Alignment</label>
          <AlignSeg value={block.align} onChange={v => onPatch({ align: v })} />
        </div>
      )}
      {block.type === 'image' && (
        <div className="esign-tpl-field-group">
          <label className="esign-tpl-inspector-label">Image URL</label>
          <input
            className="esign-tpl-inspector-input"
            value={block.src}
            onChange={e => onPatch({ src: e.target.value })}
            placeholder="https://…"
          />
          <label className="esign-tpl-inspector-label">Alt text</label>
          <input
            className="esign-tpl-inspector-input"
            value={block.alt}
            onChange={e => onPatch({ alt: e.target.value })}
          />
          <label className="esign-tpl-inspector-label">Width</label>
          <div className="esign-tpl-range-row">
            <input
              type="range"
              min={20}
              max={100}
              value={block.widthPct}
              onChange={e => onPatch({ widthPct: Number(e.target.value) })}
            />
            <span className="esign-tpl-range-val">{block.widthPct}%</span>
          </div>
        </div>
      )}
      {block.type === 'section' && (
        <div className="esign-tpl-field-group">
          <label className="esign-tpl-inspector-label">Style</label>
          <select
            className="esign-tpl-inspector-select"
            value={block.variant}
            onChange={e => onPatch({ variant: e.target.value as SectionBlock['variant'] })}
          >
            <option value="card">Card — bordered panel</option>
            <option value="minimal">Minimal — no frame</option>
            <option value="highlight">Highlight — accent rail</option>
          </select>
          <label className="esign-tpl-inspector-label">Title</label>
          <input
            className="esign-tpl-inspector-input"
            value={block.title}
            onChange={e => onPatch({ title: e.target.value })}
          />
          <label className="esign-tpl-inspector-label">Body</label>
          <textarea
            className="esign-tpl-inspector-textarea"
            rows={6}
            value={block.content}
            onChange={e => onPatch({ content: e.target.value })}
          />
          <div className="esign-tpl-field-row">
            <div>
              <label className="esign-tpl-inspector-label">Body size</label>
              <input
                type="number"
                min={10}
                max={22}
                className="esign-tpl-inspector-input"
                value={block.bodyFontSize}
                onChange={e => onPatch({ bodyFontSize: Number(e.target.value) || 14 })}
              />
            </div>
            <div>
              <label className="esign-tpl-inspector-label">Body color</label>
              <input
                type="color"
                className="esign-tpl-inspector-color esign-tpl-inspector-color--sm"
                value={block.bodyColor.length === 7 ? block.bodyColor : '#374151'}
                onChange={e => onPatch({ bodyColor: e.target.value })}
              />
            </div>
          </div>
          <label className="esign-tpl-inspector-label">Body alignment</label>
          <AlignSeg value={block.bodyAlign} onChange={v => onPatch({ bodyAlign: v })} />
        </div>
      )}
      {block.type === 'button' && (
        <div className="esign-tpl-field-group">
          <label className="esign-tpl-inspector-label">Quick styles</label>
          <div className="esign-tpl-presets">
            {BTN_PRESETS.map(p => (
              <button
                key={p.name}
                type="button"
                className="esign-tpl-preset-chip"
                style={{ background: p.bg, color: p.fg }}
                onClick={() =>
                  onPatch({ bgColor: p.bg, textColor: p.fg, borderRadius: p.r })
                }
              >
                {p.name}
              </button>
            ))}
          </div>
          <label className="esign-tpl-inspector-label">Label</label>
          <input
            className="esign-tpl-inspector-input"
            value={block.label}
            onChange={e => onPatch({ label: e.target.value })}
          />
          <label className="esign-tpl-inspector-label">Link</label>
          <input
            className="esign-tpl-inspector-input"
            value={block.href}
            onChange={e => onPatch({ href: e.target.value })}
            placeholder="https://…"
          />
          <div className="esign-tpl-field-row">
            <div>
              <label className="esign-tpl-inspector-label">Background</label>
              <input
                type="color"
                className="esign-tpl-inspector-color esign-tpl-inspector-color--sm"
                value={block.bgColor.length === 7 ? block.bgColor : '#0284c7'}
                onChange={e => onPatch({ bgColor: e.target.value })}
              />
            </div>
            <div>
              <label className="esign-tpl-inspector-label">Text</label>
              <input
                type="color"
                className="esign-tpl-inspector-color esign-tpl-inspector-color--sm"
                value={block.textColor.length === 7 ? block.textColor : '#ffffff'}
                onChange={e => onPatch({ textColor: e.target.value })}
              />
            </div>
            <div>
              <label className="esign-tpl-inspector-label">Radius</label>
              <input
                type="number"
                min={0}
                max={24}
                className="esign-tpl-inspector-input"
                value={block.borderRadius}
                onChange={e => onPatch({ borderRadius: Number(e.target.value) || 0 })}
              />
            </div>
          </div>
          <label className="esign-tpl-inspector-label">Alignment</label>
          <AlignSeg value={block.align} onChange={v => onPatch({ align: v as ButtonBlock['align'] })} />
        </div>
      )}
      {block.type === 'divider' && (
        <div className="esign-tpl-field-group">
          <label className="esign-tpl-inspector-label">Line style</label>
          <select
            className="esign-tpl-inspector-select"
            value={block.style}
            onChange={e => onPatch({ style: e.target.value as typeof block.style })}
          >
            <option value="solid">Solid</option>
            <option value="dashed">Dashed</option>
            <option value="subtle">Gradient (subtle)</option>
          </select>
        </div>
      )}
      {block.type === 'spacer' && (
        <div className="esign-tpl-field-group">
          <label className="esign-tpl-inspector-label">Height (px)</label>
          <div className="esign-tpl-range-row">
            <input
              type="range"
              min={8}
              max={120}
              value={block.height}
              onChange={e => onPatch({ height: Number(e.target.value) })}
            />
            <span className="esign-tpl-range-val">{block.height}px</span>
          </div>
        </div>
      )}

      <div className="esign-tpl-inspector-chips">
        <label className="esign-tpl-inspector-label" htmlFor="esign-merge-filter">
          Merge tags
        </label>
        <input
          id="esign-merge-filter"
          type="search"
          className="esign-tpl-inspector-input esign-tpl-merge-search"
          placeholder="Filter tags…"
          value={mergeFilter}
          onChange={e => onMergeFilterChange(e.target.value)}
        />
        <div className="esign-chips">
          {filteredChips.map(c => (
            <button key={c.token} type="button" className="esign-chip" onClick={() => onCopyToken(c.token)}>
              <span className="esign-chip-label">{c.label}</span>
              <code className="esign-chip-code">{c.token}</code>
            </button>
          ))}
        </div>
        {filteredChips.length === 0 && (
          <p className="esign-tpl-merge-empty">No tags match your filter.</p>
        )}
        <p className="esign-more-fields-text">{morePlaceholders}</p>
      </div>
    </div>
  )
}

export type EsignTemplateBuilderProps = {
  document: TemplateDocument
  onDocumentChange: (d: TemplateDocument) => void
  selectedId: string | null
  onSelectId: (id: string | null) => void
  mergeChips: { token: string; label: string }[]
  onCopyToken: (t: string) => void
  morePlaceholders: string
}

export function EsignTemplateBuilder({
  document: doc,
  onDocumentChange,
  selectedId,
  onSelectId,
  mergeChips,
  onCopyToken,
  morePlaceholders,
}: EsignTemplateBuilderProps) {
  const [overlayPalette, setOverlayPalette] = useState<BlockType | null>(null)
  const [mergeFilter, setMergeFilter] = useState('')
  const [zoom, setZoom] = useState<85 | 100 | 115>(100)
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor),
  )

  const ids = useMemo(() => doc.blocks.map(b => b.id), [doc.blocks])

  const selected = useMemo(
    () => doc.blocks.find(b => b.id === selectedId) ?? null,
    [doc, selectedId],
  )

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null
      const tag = t?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedId) {
          e.preventDefault()
          onDocumentChange(removeBlock(doc, selectedId))
          onSelectId(null)
        }
      }
      if (e.key === 'd' && (e.metaKey || e.ctrlKey) && selectedId) {
        e.preventDefault()
        const next = duplicateBlock(doc, selectedId)
        onDocumentChange(next)
        const idx = doc.blocks.findIndex(b => b.id === selectedId)
        const dup = next.blocks[idx + 1]
        if (dup) onSelectId(dup.id)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [doc, selectedId, onDocumentChange, onSelectId])

  const onDragStart = useCallback((e: DragStartEvent) => {
    const id = String(e.active.id)
    if (id.startsWith('palette-')) {
      const t = e.active.data.current?.blockType as BlockType | undefined
      if (t) setOverlayPalette(t)
    }
  }, [])

  const onDragEnd = useCallback(
    (event: DragEndEvent) => {
      setOverlayPalette(null)
      const { active, over } = event
      if (!over) return
      const aid = String(active.id)

      if (aid.startsWith('palette-')) {
        const type = active.data.current?.blockType as BlockType | undefined
        if (!type) return
        const nb = createBlock(type)
        const overId = String(over.id)
        if (overId === 'canvas-root') {
          onDocumentChange({ ...doc, blocks: [...doc.blocks, nb] })
          onSelectId(nb.id)
          return
        }
        const idx = doc.blocks.findIndex(b => b.id === overId)
        if (idx >= 0) {
          const next = [...doc.blocks]
          next.splice(idx, 0, nb)
          onDocumentChange({ ...doc, blocks: next })
          onSelectId(nb.id)
        }
        return
      }

      if (active.id !== over.id) {
        const oldIndex = doc.blocks.findIndex(b => b.id === active.id)
        const newIndex = doc.blocks.findIndex(b => b.id === over.id)
        if (oldIndex < 0 || newIndex < 0) return
        onDocumentChange({ ...doc, blocks: arrayMove(doc.blocks, oldIndex, newIndex) })
      }
    },
    [doc, onDocumentChange, onSelectId],
  )

  const patch = useCallback(
    (id: string, partial: Partial<TemplateBlock>) => {
      onDocumentChange(patchBlock(doc, id, partial))
    },
    [doc, onDocumentChange],
  )

  const del = useCallback(
    (id: string) => {
      onDocumentChange(removeBlock(doc, id))
      if (selectedId === id) onSelectId(null)
    },
    [doc, onDocumentChange, onSelectId, selectedId],
  )

  const dup = useCallback(() => {
    if (!selectedId) return
    const next = duplicateBlock(doc, selectedId)
    onDocumentChange(next)
    const idx = doc.blocks.findIndex(b => b.id === selectedId)
    const nb = next.blocks[idx + 1]
    if (nb) onSelectId(nb.id)
  }, [doc, onDocumentChange, onSelectId, selectedId])

  const paletteGroups = useMemo(() => {
    const g: Record<string, typeof PALETTE> = {}
    for (const p of PALETTE) {
      if (!g[p.group]) g[p.group] = []
      g[p.group].push(p)
    }
    return g
  }, [])

  const zoomStyle = {
    transform: `scale(${zoom / 100})`,
    transformOrigin: 'top center' as const,
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
    >
      <div className="esign-tpl-builder">
        <aside className="esign-tpl-panel esign-tpl-panel--left">
          <div className="esign-tpl-panel-head">
            <h4 className="esign-tpl-panel-title">Block library</h4>
            <p className="esign-tpl-panel-hint">Drag into the document or reorder on the page.</p>
          </div>
          {Object.entries(paletteGroups).map(([group, items]) => (
            <div key={group} className="esign-tpl-palette-group">
              <p className="esign-tpl-palette-group-label">{group}</p>
              <div className="esign-tpl-palette">
                {items.map(p => (
                  <div key={p.type} className="esign-tpl-palette-row">
                    <PaletteItem type={p.type} label={p.label} />
                    <span className="esign-tpl-palette-hint">{p.hint}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </aside>

        <div className="esign-tpl-panel esign-tpl-panel--center">
          <div className="esign-tpl-canvas-head">
            <div>
              <h4 className="esign-tpl-panel-title">Document</h4>
              <p className="esign-tpl-canvas-meta">
                {doc.blocks.length} block{doc.blocks.length === 1 ? '' : 's'}
              </p>
            </div>
            <div className="esign-tpl-canvas-actions">
              <div className="esign-tpl-zoom" role="group" aria-label="Canvas zoom">
                <button
                  type="button"
                  className={`esign-tpl-zoom-btn${zoom === 85 ? ' is-active' : ''}`}
                  onClick={() => setZoom(85)}
                >
                  85%
                </button>
                <button
                  type="button"
                  className={`esign-tpl-zoom-btn${zoom === 100 ? ' is-active' : ''}`}
                  onClick={() => setZoom(100)}
                >
                  100%
                </button>
                <button
                  type="button"
                  className={`esign-tpl-zoom-btn${zoom === 115 ? ' is-active' : ''}`}
                  onClick={() => setZoom(115)}
                >
                  115%
                </button>
              </div>
              {selectedId && (
                <>
                  <button type="button" className="esign-tpl-tool-btn" onClick={dup}>
                    Duplicate
                  </button>
                  <button type="button" className="esign-tpl-remove-btn" onClick={() => del(selectedId)}>
                    Remove
                  </button>
                </>
              )}
            </div>
          </div>
          <div className="esign-tpl-canvas-shell">
            <div className="esign-tpl-canvas-paper" style={zoomStyle}>
              <CanvasDropZone onBackgroundClick={() => onSelectId(null)}>
                <SortableContext items={ids} strategy={verticalListSortingStrategy}>
                  {doc.blocks.length === 0 ? (
                    <div className="esign-tpl-empty-canvas">
                      <div className="esign-tpl-empty-icon" aria-hidden>
                        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                          <path d="M14 2v6h6M12 18v-6M9 15h6" strokeLinecap="round" />
                        </svg>
                      </div>
                      <p className="esign-tpl-empty-title">Start your template</p>
                      <p className="esign-tpl-empty-text">
                        Drag blocks from the library, or duplicate a block with{' '}
                        <kbd className="esign-tpl-kbd">Ctrl</kbd> + <kbd className="esign-tpl-kbd">D</kbd>.
                      </p>
                    </div>
                  ) : (
                    doc.blocks.map(b => (
                      <SortableCanvasBlock
                        key={b.id}
                        block={b}
                        selected={b.id === selectedId}
                        onSelect={() => onSelectId(b.id)}
                      />
                    ))
                  )}
                </SortableContext>
              </CanvasDropZone>
            </div>
          </div>
          <p className="esign-tpl-canvas-foot">
            Shortcuts: <kbd className="esign-tpl-kbd">Ctrl</kbd> + <kbd className="esign-tpl-kbd">D</kbd> duplicate ·{' '}
            <kbd className="esign-tpl-kbd">Del</kbd> delete (when not typing)
          </p>
        </div>

        <aside className="esign-tpl-panel esign-tpl-panel--right">
          <div className="esign-tpl-panel-head">
            <h4 className="esign-tpl-panel-title">Inspector</h4>
            <p className="esign-tpl-panel-hint">Selection & merge fields</p>
          </div>
          {selected ? (
            <BlockInspector
              block={selected}
              onPatch={p => patch(selected.id, p)}
              mergeChips={mergeChips}
              onCopyToken={onCopyToken}
              morePlaceholders={morePlaceholders}
              mergeFilter={mergeFilter}
              onMergeFilterChange={setMergeFilter}
            />
          ) : (
            <div className="esign-tpl-inspector-empty-wrap">
              <div className="esign-tpl-inspector-empty-icon" aria-hidden>
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25">
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 8v4l3 2" strokeLinecap="round" />
                </svg>
              </div>
              <p className="esign-tpl-inspector-empty-title">Nothing selected</p>
              <p className="esign-tpl-inspector-empty">
                Click a block on the page to edit copy, colors, spacing, and merge tags.
              </p>
            </div>
          )}
        </aside>
      </div>

      <DragOverlay dropAnimation={null}>
        {overlayPalette ? (
          <div className="esign-tpl-overlay">
            <span className="esign-tpl-overlay-icon">{ICONS[overlayPalette]}</span>
            {PALETTE.find(p => p.type === overlayPalette)?.label}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}
