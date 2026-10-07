import type { CSSProperties } from 'react'
import { GLYPHS, type IconName } from './glyphs'

type Props = {
  name: IconName
  size?: number
  strokeWidth?: number
  className?: string
  style?: CSSProperties
  /** Accessible label. Omit for decorative icons (the default). */
  title?: string
}

/** Crisp line icon from the shared glyph registry. Inherits `currentColor`. */
export default function Icon({ name, size = 18, strokeWidth = 1.75, className, style, title }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className ? `nx-icon ${className}` : 'nx-icon'}
      style={style}
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      focusable="false"
    >
      {title ? <title>{title}</title> : null}
      {GLYPHS[name]}
    </svg>
  )
}
