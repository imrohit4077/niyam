import { useCallback, useEffect } from 'react'
import { useEditor, EditorContent, type Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import Youtube from '@tiptap/extension-youtube'

function IconBold() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden>
      <path d="M6 4h8a4 4 0 014 4 4 4 0 01-4 4H6z" />
      <path d="M6 12h9a4 4 0 014 4 4 4 0 01-4 4H6z" />
    </svg>
  )
}

function IconItalic() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden>
      <line x1="19" y1="4" x2="10" y2="4" />
      <line x1="14" y1="20" x2="5" y2="20" />
      <line x1="15" y1="4" x2="9" y2="20" />
    </svg>
  )
}

function IconHeading({ level }: { level: 2 | 3 }) {
  return <span className="rich-text-heading-btn-txt">{level === 2 ? 'H2' : 'H3'}</span>
}

function IconListBullet() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
      <line x1="9" y1="6" x2="20" y2="6" />
      <line x1="9" y1="12" x2="20" y2="12" />
      <line x1="9" y1="18" x2="20" y2="18" />
      <circle cx="5" cy="6" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="5" cy="12" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="5" cy="18" r="1.5" fill="currentColor" stroke="none" />
    </svg>
  )
}

function IconListOrdered() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
      <line x1="11" y1="6" x2="20" y2="6" />
      <line x1="11" y1="12" x2="20" y2="12" />
      <line x1="11" y1="18" x2="20" y2="18" />
      <path d="M4 6h1v4M4 10h2M6 18H4v-4l-1 1" />
    </svg>
  )
}

function IconLink() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
      <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
    </svg>
  )
}

function IconYoutube() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
      <path d="M22.54 6.42a2.78 2.78 0 00-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 00-1.94 2A29 29 0 001 11.75a29 29 0 00.46 5.33A2.78 2.78 0 003.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 001.94-2 29 29 0 00.46-5.25 29 29 0 00-.46-5.33z" />
      <polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02" fill="currentColor" stroke="none" />
    </svg>
  )
}

function IconUndo() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
      <path d="M3 7v6h6" />
      <path d="M21 17a9 9 0 00-9-9 9 9 0 00-6 2.3L3 13" />
    </svg>
  )
}

function IconRedo() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
      <path d="M21 7v6h-6" />
      <path d="M3 17a9 9 0 019-9 9 9 0 016 2.3l3-2.7" />
    </svg>
  )
}

function Toolbar({ editor }: { editor: Editor | null }) {
  const setLink = useCallback(() => {
    if (!editor) return
    const prev = editor.getAttributes('link').href as string | undefined
    const url = window.prompt('Link URL', prev ?? 'https://')
    if (url === null) return
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run()
      return
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
  }, [editor])

  const addYoutube = useCallback(() => {
    if (!editor) return
    const url = window.prompt('Paste YouTube video URL', 'https://www.youtube.com/watch?v=')
    if (!url?.trim()) return
    editor.chain().focus().setYoutubeVideo({ src: url.trim() }).run()
  }, [editor])

  if (!editor) return null

  return (
    <div className="rich-text-toolbar" role="toolbar" aria-label="Formatting">
      <div className="rich-text-toolbar-inner">
        <div className="rich-text-tb-group">
          <button
            type="button"
            className={`rich-text-icon-btn ${editor.isActive('bold') ? 'is-on' : ''}`}
            onClick={() => editor.chain().focus().toggleBold().run()}
            title="Bold"
            aria-label="Bold"
          >
            <IconBold />
          </button>
          <button
            type="button"
            className={`rich-text-icon-btn ${editor.isActive('italic') ? 'is-on' : ''}`}
            onClick={() => editor.chain().focus().toggleItalic().run()}
            title="Italic"
            aria-label="Italic"
          >
            <IconItalic />
          </button>
        </div>
        <div className="rich-text-tb-group">
          <button
            type="button"
            className={`rich-text-icon-btn rich-text-icon-btn--heading ${editor.isActive('heading', { level: 2 }) ? 'is-on' : ''}`}
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            title="Heading 2"
            aria-label="Heading 2"
          >
            <IconHeading level={2} />
          </button>
          <button
            type="button"
            className={`rich-text-icon-btn rich-text-icon-btn--heading ${editor.isActive('heading', { level: 3 }) ? 'is-on' : ''}`}
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            title="Heading 3"
            aria-label="Heading 3"
          >
            <IconHeading level={3} />
          </button>
        </div>
        <div className="rich-text-tb-group">
          <button
            type="button"
            className={`rich-text-icon-btn ${editor.isActive('bulletList') ? 'is-on' : ''}`}
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            title="Bullet list"
            aria-label="Bullet list"
          >
            <IconListBullet />
          </button>
          <button
            type="button"
            className={`rich-text-icon-btn ${editor.isActive('orderedList') ? 'is-on' : ''}`}
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            title="Numbered list"
            aria-label="Numbered list"
          >
            <IconListOrdered />
          </button>
        </div>
        <div className="rich-text-tb-group">
          <button
            type="button"
            className={`rich-text-icon-btn ${editor.isActive('link') ? 'is-on' : ''}`}
            onClick={setLink}
            title="Insert link"
            aria-label="Insert link"
          >
            <IconLink />
          </button>
          <button type="button" className="rich-text-icon-btn" onClick={addYoutube} title="Embed YouTube" aria-label="Embed YouTube">
            <IconYoutube />
          </button>
        </div>
        <div className="rich-text-tb-group rich-text-tb-group-spacer">
          <button
            type="button"
            className="rich-text-icon-btn"
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
            title="Undo"
            aria-label="Undo"
          >
            <IconUndo />
          </button>
          <button
            type="button"
            className="rich-text-icon-btn"
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
            title="Redo"
            aria-label="Redo"
          >
            <IconRedo />
          </button>
        </div>
      </div>
    </div>
  )
}

interface Props {
  value: string
  onChange: (html: string) => void
  placeholder?: string
  minHeight?: number
}

export default function RichTextEditor({ value, onChange, placeholder, minHeight = 220 }: Props) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        bulletList: { keepMarks: true },
        orderedList: { keepMarks: true },
      }),
      Link.configure({ openOnClick: false, autolink: true, linkOnPaste: true }),
      Placeholder.configure({
        placeholder: placeholder ?? 'Write the role description, embed a video…',
      }),
      Youtube.configure({
        width: 640,
        height: 360,
        nocookie: true,
        modestBranding: true,
      }),
    ],
    content: value || '<p></p>',
    editorProps: {
      attributes: {
        class: 'rich-text-prose',
        style: `min-height: ${minHeight}px`,
      },
    },
    onUpdate: ({ editor: ed }) => {
      onChange(ed.getHTML())
    },
  })

  useEffect(() => {
    if (!editor) return
    const current = editor.getHTML()
    const next = value || '<p></p>'
    if (next !== current) {
      editor.commands.setContent(next, { emitUpdate: false })
    }
  }, [editor, value])

  return (
    <div className="rich-text-editor-shell">
      <Toolbar editor={editor} />
      <div className="rich-text-editor-frame">
        <EditorContent editor={editor} />
      </div>
    </div>
  )
}
