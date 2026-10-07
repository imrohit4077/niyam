/**
 * Niyam icon system — import every icon from here.
 *
 *  - <Icon name="jobs" />        crisp line glyph for dense UI (nav, buttons, tables)
 *  - <Icon3D name="jobs" tile /> glossy 3D render for headers, KPIs, empty states, settings tiles
 *  - <Hero3D satellites={…} />   live floating three.js scene for hero areas
 *
 * Glyphs live in `glyphs.tsx`, 3D models in `three/models.ts`; both share names.
 */
export { default as Icon } from './Icon'
export { default as Icon3D } from './Icon3D'
export { default as Hero3D } from './Hero3D'
export type { IconName } from './glyphs'
export type { Model3DName } from './three/meta'
