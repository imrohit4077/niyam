/**
 * 3D icon catalogue — names + tile tints only. Kept free of `three` imports so
 * pages can render placeholder tiles instantly while the WebGL chunk loads.
 * Every name here has a builder in `models.ts` and a glyph in `glyphs.tsx`.
 */
export const MODEL_META = {
  brand: { tint: '#4157ff' },
  dashboard: { tint: '#4157ff' },
  analytics: { tint: '#4157ff' },
  profile: { tint: '#4f6bff' },
  candidates: { tint: '#7c5cff' },
  team: { tint: '#2ec5f0' },
  jobs: { tint: '#4157ff' },
  kickoff: { tint: '#ff6b81' },
  plans: { tint: '#ff6b81' },
  pipeline: { tint: '#7c5cff' },
  boards: { tint: '#2ec5f0' },
  postings: { tint: '#ff8a5c' },
  attributes: { tint: '#7c5cff' },
  stages: { tint: '#2ec5f0' },
  applications: { tint: '#4157ff' },
  interviews: { tint: '#ff6b81' },
  signature: { tint: '#4157ff' },
  referrals: { tint: '#7c5cff' },
  settings: { tint: '#5866a8' },
  fields: { tint: '#2ec5f0' },
  labels: { tint: '#ffb547' },
  mail: { tint: '#4157ff' },
  audit: { tint: '#1fbf87' },
  esign: { tint: '#2a35a8' },
  trophy: { tint: '#ffb547' },
  clock: { tint: '#4157ff' },
  funnel: { tint: '#2ec5f0' },
  building: { tint: '#4157ff' },
  location: { tint: '#ff6b81' },
  palette: { tint: '#ff8a5c' },
  typography: { tint: '#7c5cff' },
  folder: { tint: '#ffb547' },
  sparkle: { tint: '#7c5cff' },
  inbox: { tint: '#4157ff' },
  search: { tint: '#2ec5f0' },
  bell: { tint: '#ffb547' },
  link: { tint: '#2ec5f0' },
  lock: { tint: '#ffb547' },
  workspace: { tint: '#4157ff' },
  star: { tint: '#ffb547' },
} as const

export type Model3DName = keyof typeof MODEL_META

/** Bump when model geometry/materials change so cached renders are invalidated. */
export const MODEL_VERSION = 4
