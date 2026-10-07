import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import type { Model3DName } from './meta'

/**
 * Procedural 3D icon models. Every model is built from primitives (no external
 * assets), faces +Z, and fits roughly inside a 2×2×2 box; `frameModel` applies
 * the shared three-quarter tilt and normalises scale so all icons sit at the
 * same visual weight.
 */

/** Brand palette for 3D — mirrors the CSS tokens in styles/tokens.css. */
export const C = {
  brand: '#4157ff',
  brandDeep: '#2a35a8',
  brandSoft: '#8d9bff',
  cyan: '#2ec5f0',
  cyanSoft: '#8fe3fa',
  violet: '#7c5cff',
  violetSoft: '#b4a2ff',
  coral: '#ff6b81',
  orange: '#ff8a5c',
  amber: '#ffb547',
  gold: '#f4a62a',
  emerald: '#1fbf87',
  porcelain: '#f4f6fc',
  mist: '#d3daf0',
  ink: '#1d2150',
  steel: '#7f8bc6',
} as const

type V3 = [number, number, number]

type MatOpts = { rough?: number; metal?: number; opacity?: number; glow?: number; doubleSide?: boolean }

const materialCache = new Map<string, THREE.MeshPhysicalMaterial>()

/** Shared glossy "soft-touch plastic with clearcoat" material, cached per look. */
function mat(color: string, o: MatOpts = {}): THREE.MeshPhysicalMaterial {
  const key = `${color}|${o.rough ?? ''}|${o.metal ?? ''}|${o.opacity ?? ''}|${o.glow ?? ''}|${o.doubleSide ? 1 : 0}`
  let m = materialCache.get(key)
  if (!m) {
    const opacity = o.opacity ?? 1
    m = new THREE.MeshPhysicalMaterial({
      color,
      roughness: o.rough ?? 0.34,
      metalness: o.metal ?? 0.04,
      clearcoat: 0.75,
      clearcoatRoughness: 0.2,
      transparent: opacity < 1,
      opacity,
      emissive: new THREE.Color(color),
      emissiveIntensity: o.glow ?? 0,
      side: o.doubleSide ? THREE.DoubleSide : THREE.FrontSide,
    })
    materialCache.set(key, m)
  }
  return m
}

const gold = () => mat(C.gold, { metal: 0.55, rough: 0.24 })

/* ── Primitive helpers ─────────────────────────────────────────────────── */

function place<T extends THREE.Object3D>(o: T, p: V3 = [0, 0, 0], r: V3 = [0, 0, 0], s?: number | V3): T {
  o.position.set(...p)
  o.rotation.set(...r)
  if (s !== undefined) {
    if (typeof s === 'number') o.scale.setScalar(s)
    else o.scale.set(...s)
  }
  return o
}

const mesh = (g: THREE.BufferGeometry, m: THREE.Material) => new THREE.Mesh(g, m)

const rbox = (w: number, h: number, d: number, r: number, m: THREE.Material) =>
  mesh(new RoundedBoxGeometry(w, h, d, 5, r), m)

const cyl = (rt: number, rb: number, h: number, m: THREE.Material, seg = 56) =>
  mesh(new THREE.CylinderGeometry(rt, rb, h, seg), m)

const ball = (r: number, m: THREE.Material) => mesh(new THREE.SphereGeometry(r, 48, 32), m)

const torus = (R: number, t: number, m: THREE.Material, arc = Math.PI * 2) =>
  mesh(new THREE.TorusGeometry(R, t, 24, 96, arc), m)

const capsule = (r: number, len: number, m: THREE.Material) => mesh(new THREE.CapsuleGeometry(r, len, 8, 24), m)

const lathe = (pts: [number, number][], m: THREE.Material) =>
  mesh(new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(x, y)), 72), m)

function extrude(shape: THREE.Shape, depth: number, bevel: number, m: THREE.Material) {
  const g = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 8,
    curveSegments: 40,
  })
  g.translate(0, 0, -depth / 2)
  return mesh(g, m)
}

function tube(pts: V3[], r: number, m: THREE.Material) {
  const curve = new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(...p)))
  return mesh(new THREE.TubeGeometry(curve, 96, r, 16, false), m)
}

function group(...kids: THREE.Object3D[]) {
  const g = new THREE.Group()
  for (const k of kids) g.add(k)
  return g
}

function polyShape(pts: [number, number][]) {
  const s = new THREE.Shape()
  s.moveTo(...pts[0])
  for (const p of pts.slice(1)) s.lineTo(...p)
  s.closePath()
  return s
}

/* ── Reusable parts ────────────────────────────────────────────────────── */

function shieldShape(scale = 1) {
  const k = scale
  const s = new THREE.Shape()
  s.moveTo(0, 0.92 * k)
  s.quadraticCurveTo(-0.38 * k, 0.7 * k, -0.78 * k, 0.66 * k)
  s.lineTo(-0.78 * k, 0.05 * k)
  s.quadraticCurveTo(-0.76 * k, -0.6 * k, 0, -0.98 * k)
  s.quadraticCurveTo(0.76 * k, -0.6 * k, 0.78 * k, 0.05 * k)
  s.lineTo(0.78 * k, 0.66 * k)
  s.quadraticCurveTo(0.38 * k, 0.7 * k, 0, 0.92 * k)
  return s
}

function halfShieldShape(side: -1 | 1) {
  const s = new THREE.Shape()
  s.moveTo(0, 0.92)
  s.quadraticCurveTo(side * 0.38, 0.7, side * 0.78, 0.66)
  s.lineTo(side * 0.78, 0.05)
  s.quadraticCurveTo(side * 0.76, -0.6, 0, -0.98)
  s.lineTo(0, 0.92)
  return s
}

function starShape(points: number, outer: number, inner: number) {
  const pts: [number, number][] = []
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outer : inner
    const a = Math.PI / 2 + (i * Math.PI) / points
    pts.push([Math.cos(a) * r, Math.sin(a) * r])
  }
  return polyShape(pts)
}

function sparkleShape(r: number) {
  const s = new THREE.Shape()
  const c = r * 0.14
  s.moveTo(0, r)
  s.quadraticCurveTo(c, c, r, 0)
  s.quadraticCurveTo(c, -c, 0, -r)
  s.quadraticCurveTo(-c, -c, -r, 0)
  s.quadraticCurveTo(-c, c, 0, r)
  return s
}

function gearShape(teeth: number, rOuter: number, rInner: number, hole: number) {
  const pts: [number, number][] = []
  const step = (Math.PI * 2) / teeth
  for (let i = 0; i < teeth; i++) {
    const a = i * step
    const at = (r: number, f: number): [number, number] => [Math.cos(a + f * step) * r, Math.sin(a + f * step) * r]
    pts.push(at(rInner, 0), at(rInner, 0.18), at(rOuter, 0.3), at(rOuter, 0.7), at(rInner, 0.82))
  }
  const s = polyShape(pts)
  const h = new THREE.Path()
  h.absarc(0, 0, hole, 0, Math.PI * 2, true)
  s.holes.push(h)
  return s
}

/** White check mark built from two rounded bars. */
function checkMark(m: THREE.Material, k = 1, depth = 0.1) {
  return group(
    place(rbox(0.4 * k, 0.15 * k, depth, 0.06 * k, m), [-0.2 * k, -0.1 * k, 0], [0, 0, -Math.PI / 4]),
    place(rbox(0.74 * k, 0.15 * k, depth, 0.06 * k, m), [0.13 * k, 0.03 * k, 0], [0, 0, 0.88]),
  )
}

function plusMark(m: THREE.Material, k = 1, depth = 0.1) {
  return group(rbox(0.5 * k, 0.14 * k, depth, 0.06 * k, m), rbox(0.14 * k, 0.5 * k, depth, 0.06 * k, m))
}

/** Stylised bust: lathe shoulders + sphere head. */
function person(body: string, head: string) {
  const shoulders = lathe(
    [
      [0, -0.62],
      [0.5, -0.62],
      [0.62, -0.56],
      [0.67, -0.38],
      [0.62, -0.16],
      [0.47, 0.0],
      [0.26, 0.07],
      [0, 0.09],
    ],
    mat(body),
  )
  return group(shoulders, place(ball(0.34, mat(head)), [0, 0.47, 0]))
}

function paper(lines: number, accent: string) {
  const g = group(rbox(1.35, 1.75, 0.12, 0.1, mat(C.porcelain)))
  g.add(place(rbox(0.58, 0.13, 0.05, 0.05, mat(accent)), [-0.2, 0.6, 0.07]))
  for (let i = 0; i < lines; i++) {
    const w = i === lines - 1 ? 0.55 : 0.95
    g.add(place(rbox(w, 0.08, 0.04, 0.03, mat(C.mist)), [-(0.95 - w) / 2, 0.3 - i * 0.22, 0.07]))
  }
  return g
}

function arrowAlong(dir: V3, length: number) {
  const g = group(
    place(cyl(0.045, 0.045, length, gold()), [0, length / 2, 0]),
    place(mesh(new THREE.ConeGeometry(0.1, 0.24, 32), mat(C.ink)), [0, -0.08, 0], [Math.PI, 0, 0]),
    place(rbox(0.04, 0.3, 0.2, 0.02, mat(C.violet)), [0, length - 0.1, 0.07], [0.35, 0, 0]),
    place(rbox(0.04, 0.3, 0.2, 0.02, mat(C.violet)), [0, length - 0.1, -0.07], [-0.35, 0, 0]),
  )
  g.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(...dir).normalize())
  return g
}

/* ── Model builders ────────────────────────────────────────────────────── */

type Builder = () => THREE.Group

function brand() {
  const left = extrude(halfShieldShape(-1), 0.26, 0.07, mat(C.brandDeep))
  const right = extrude(halfShieldShape(1), 0.26, 0.07, mat('#3a7bff'))
  const lines = group(
    ...[0.42, 0.14, -0.14].map(y => place(rbox(0.74, 0.13, 0.08, 0.05, mat(C.porcelain)), [0, y, 0.2])),
    place(rbox(0.38, 0.13, 0.08, 0.05, mat(C.porcelain)), [-0.18, -0.42, 0.2]),
  )
  const arcA = place(torus(1.28, 0.075, mat(C.cyan), Math.PI * 1.05), [0, -0.04, 0], [0, 0, -0.28])
  const arcB = place(torus(1.28, 0.075, mat(C.brandDeep), Math.PI * 0.62), [0, -0.04, 0], [0, 0, Math.PI * 0.95])
  const g = group(left, right, lines, arcA, arcB)
  g.userData.tilt = [0.18, -0.42, 0]
  return g
}

function profile() {
  return person(C.brand, C.brandSoft)
}

function candidates() {
  return group(
    place(person(C.violet, C.violetSoft), [0.48, 0.1, -0.45], [0, 0, 0], 0.86),
    place(person(C.brand, C.brandSoft), [-0.22, 0, 0.1]),
  )
}

function team() {
  return group(
    place(person(C.cyan, C.cyanSoft), [-0.78, 0.04, -0.4], [0, 0.2, 0], 0.8),
    place(person(C.violet, C.violetSoft), [0.78, 0.04, -0.4], [0, -0.2, 0], 0.8),
    place(person(C.brand, C.brandSoft), [0, 0, 0.15]),
  )
}

function jobs() {
  return group(
    place(rbox(1.9, 1.3, 0.72, 0.18, mat(C.brand)), [0, -0.1, 0]),
    place(rbox(1.93, 0.16, 0.75, 0.06, mat(C.brandDeep)), [0, 0.08, 0]),
    place(rbox(0.36, 0.28, 0.16, 0.06, gold()), [0, 0.08, 0.38]),
    place(torus(0.34, 0.085, mat(C.brandDeep), Math.PI), [0, 0.55, 0]),
  )
}

function kickoff() {
  const body = lathe(
    [
      [0, -0.75],
      [0.36, -0.75],
      [0.44, -0.45],
      [0.46, 0.1],
      [0.4, 0.55],
      [0, 0.55],
    ],
    mat(C.porcelain),
  )
  const nose = lathe(
    [
      [0, 0.55],
      [0.4, 0.55],
      [0.33, 0.78],
      [0.19, 0.98],
      [0, 1.12],
    ],
    mat(C.coral),
  )
  const windowRim = place(torus(0.19, 0.05, mat(C.brand)), [0, 0.12, 0.43])
  const glass = place(ball(0.16, mat(C.cyan, { rough: 0.1 })), [0, 0.12, 0.4])
  const finShape = polyShape([
    [0, 0.12],
    [0.34, -0.22],
    [0.36, -0.62],
    [0, -0.42],
  ])
  const fins = group()
  for (let i = 0; i < 3; i++) {
    const pivot = group(place(extrude(finShape, 0.06, 0.03, mat(C.coral)), [0.36, -0.28, 0]))
    pivot.rotation.y = (i * Math.PI * 2) / 3 + Math.PI / 2
    fins.add(pivot)
  }
  const flame = lathe(
    [
      [0, -0.75],
      [0.26, -0.78],
      [0.18, -1.02],
      [0, -1.32],
    ],
    mat(C.amber, { glow: 0.35 }),
  )
  const rocket = group(body, nose, windowRim, glass, fins, flame)
  rocket.rotation.z = -0.62
  return group(rocket)
}

function plans() {
  const disc = (r: number, h: number, color: string) => place(cyl(r, r, h, mat(color)), [0, 0, 0], [Math.PI / 2, 0, 0])
  return group(
    disc(1.0, 0.16, C.porcelain),
    disc(0.75, 0.22, C.coral),
    disc(0.5, 0.28, C.porcelain),
    disc(0.25, 0.34, C.coral),
    place(arrowAlong([0.55, 0.5, 0.9], 1.25), [0, 0, 0.2]),
  )
}

function pipeline() {
  const g = group(rbox(2.3, 1.8, 0.16, 0.14, mat(C.porcelain)))
  const cols: [number, number, string][] = [
    [-0.72, 3, C.brand],
    [0, 2, C.violet],
    [0.72, 1, C.emerald],
  ]
  for (const [x, n, color] of cols) {
    g.add(place(rbox(0.62, 1.55, 0.05, 0.08, mat(C.mist)), [x, 0, 0.07]))
    for (let i = 0; i < n; i++) g.add(place(rbox(0.52, 0.36, 0.12, 0.08, mat(color)), [x, 0.52 - i * 0.46, 0.15]))
  }
  g.userData.tilt = [0.3, -0.45, 0]
  return g
}

function boards() {
  return group(
    ball(0.9, mat(C.brand)),
    place(torus(0.905, 0.028, mat(C.cyan)), [0, 0, 0], [Math.PI / 2, 0, 0]),
    place(torus(0.905, 0.028, mat(C.cyan)), [0, 0, 0], [0, 0.6, 0]),
    place(torus(0.905, 0.028, mat(C.cyan)), [0, 0, 0], [0, -0.6, 0]),
    place(torus(1.1, 0.05, gold()), [0, 0, 0], [1.25, 0.15, 0.35]),
    place(ball(0.13, mat(C.coral)), [0.92, 0.48, 0.3]),
  )
}

function postings() {
  const horn = lathe(
    [
      [0.26, -0.65],
      [0.3, -0.35],
      [0.42, -0.05],
      [0.62, 0.32],
      [0.8, 0.62],
    ],
    mat(C.coral, { doubleSide: true }),
  )
  const megaphone = group(
    horn,
    place(cyl(0.79, 0.79, 0.03, mat(C.ink)), [0, 0.6, 0]),
    place(torus(0.8, 0.07, mat(C.porcelain)), [0, 0.62, 0], [Math.PI / 2, 0, 0]),
    place(cyl(0.3, 0.3, 0.26, mat(C.porcelain)), [0, -0.76, 0]),
  )
  megaphone.rotation.z = -Math.PI / 2
  const wave = (R: number) => place(torus(R, 0.055, gold(), 0.9), [0.62, 0, 0], [0, 0, -0.45])
  return group(
    place(megaphone, [-0.3, 0, 0], [0, 0, 0.25]),
    place(rbox(0.2, 0.55, 0.2, 0.07, mat(C.ink)), [-0.55, -0.5, 0], [0, 0, 0.3]),
    place(wave(0.98), [-0.1, 0.2, 0]),
    place(wave(1.26), [-0.1, 0.2, 0]),
  )
}

function attributes() {
  const slab = (y: number, color: string) => place(rbox(1.6, 0.2, 1.6, 0.1, mat(color)), [0, y, 0])
  const g = group(slab(-0.44, C.cyan), slab(0, C.violet), slab(0.44, C.brand))
  g.userData.tilt = [0.55, 0.78, 0]
  return g
}

function stages() {
  const step = (x: number, h: number, color: string) => place(rbox(0.62, h, 0.8, 0.08, mat(color)), [x, -0.8 + h / 2, 0])
  const flag = extrude(
    polyShape([
      [0, 0],
      [0.42, -0.14],
      [0, -0.3],
    ]),
    0.04,
    0.02,
    mat(C.coral),
  )
  return group(
    step(-0.68, 0.6, C.cyan),
    step(0, 1.1, C.violet),
    step(0.68, 1.6, C.brand),
    place(cyl(0.03, 0.03, 0.62, mat(C.ink)), [0.68, 1.1, 0]),
    place(flag, [0.7, 1.4, 0]),
  )
}

function applications() {
  const badge = group(
    place(cyl(0.34, 0.34, 0.16, mat(C.emerald)), [0, 0, 0], [Math.PI / 2, 0, 0]),
    place(checkMark(mat(C.porcelain), 0.55, 0.08), [0, 0, 0.1]),
  )
  const g = group(paper(4, C.brand), place(badge, [0.52, -0.66, 0.14]))
  g.userData.tilt = [0.22, -0.4, 0]
  return g
}

function interviews() {
  const g = group(
    place(rbox(1.7, 1.55, 0.28, 0.16, mat(C.porcelain)), [0, -0.05, 0]),
    place(rbox(1.7, 0.42, 0.3, 0.14, mat(C.coral)), [0, 0.56, 0]),
    place(capsule(0.07, 0.22, mat(C.ink)), [-0.45, 0.8, 0.05]),
    place(capsule(0.07, 0.22, mat(C.ink)), [0.45, 0.8, 0.05]),
  )
  const rows = [0.08, -0.24, -0.56]
  const cols = [-0.5, 0, 0.5]
  rows.forEach((y, ri) =>
    cols.forEach((x, ci) => {
      const hot = ri === 1 && ci === 1
      if (ri === 2 && ci === 2) return
      g.add(place(rbox(0.36, 0.24, 0.06, 0.05, mat(hot ? C.brand : C.mist)), [x, y, 0.15]))
    }),
  )
  g.userData.tilt = [0.24, -0.45, 0]
  return g
}

function signature() {
  const squiggle = tube(
    [
      [-0.48, -0.5, 0.08],
      [-0.3, -0.28, 0.08],
      [-0.16, -0.58, 0.08],
      [0.02, -0.32, 0.08],
      [0.18, -0.55, 0.08],
      [0.34, -0.42, 0.08],
    ],
    0.035,
    mat(C.brand),
  )
  const pen = group(
    cyl(0.09, 0.09, 1.25, mat(C.brandDeep)),
    place(cyl(0.1, 0.1, 0.3, mat(C.ink)), [0, -0.5, 0]),
    place(mesh(new THREE.ConeGeometry(0.09, 0.26, 32), gold()), [0, -0.78, 0], [Math.PI, 0, 0]),
  )
  const g = group(paper(3, C.violet), squiggle, place(pen, [0.55, 0.0, 0.4], [0.2, 0, 0.62]))
  g.userData.tilt = [0.22, -0.42, 0]
  return g
}

function referrals() {
  const lid = mat(C.violetSoft)
  return group(
    place(rbox(1.4, 1.0, 1.4, 0.08, mat(C.violet)), [0, -0.25, 0]),
    place(rbox(1.56, 0.32, 1.56, 0.08, lid), [0, 0.4, 0]),
    place(rbox(0.24, 1.02, 1.42, 0.04, gold()), [0, -0.25, 0]),
    place(rbox(1.42, 1.02, 0.24, 0.04, gold()), [0, -0.25, 0]),
    place(rbox(0.26, 0.34, 1.58, 0.04, gold()), [0, 0.4, 0]),
    place(rbox(1.58, 0.34, 0.26, 0.04, gold()), [0, 0.4, 0]),
    place(torus(0.24, 0.08, gold()), [-0.24, 0.78, 0], [0, 0, 0.55]),
    place(torus(0.24, 0.08, gold()), [0.24, 0.78, 0], [0, 0, -0.55]),
    place(ball(0.11, gold()), [0, 0.6, 0]),
  )
}

function settings() {
  const big = extrude(gearShape(9, 1.0, 0.8, 0.34), 0.3, 0.05, mat(C.steel, { metal: 0.3, rough: 0.28 }))
  const hub = place(cyl(0.26, 0.26, 0.42, mat(C.brand)), [0, 0, 0], [Math.PI / 2, 0, 0])
  const small = place(
    extrude(gearShape(7, 0.5, 0.38, 0.14), 0.26, 0.04, mat(C.cyan)),
    [0.92, 0.78, -0.3],
    [0, 0, 0.2],
  )
  return group(big, hub, small)
}

function fields() {
  const tile = (x: number, y: number, color: string) => place(rbox(0.84, 0.84, 0.24, 0.16, mat(color)), [x, y, 0])
  const g = group(
    tile(-0.47, 0.47, C.brand),
    tile(0.47, 0.47, C.mist),
    tile(-0.47, -0.47, C.mist),
    tile(0.47, -0.47, C.cyan),
    place(plusMark(mat(C.porcelain), 0.9, 0.08), [0.47, -0.47, 0.13]),
  )
  g.userData.tilt = [0.3, -0.48, 0]
  return g
}

function labels() {
  const s = polyShape([
    [-1.0, 0],
    [-0.5, 0.55],
    [0.9, 0.55],
    [0.9, -0.55],
    [-0.5, -0.55],
  ])
  const hole = new THREE.Path()
  hole.absarc(-0.48, 0, 0.14, 0, Math.PI * 2, true)
  s.holes.push(hole)
  const tag = extrude(s, 0.16, 0.06, mat(C.amber))
  const string = tube(
    [
      [-0.48, 0.0, 0.0],
      [-0.75, 0.35, 0.12],
      [-0.95, 0.75, 0.05],
      [-0.7, 0.98, -0.05],
    ],
    0.03,
    mat(C.ink),
  )
  return group(place(tag, [0, 0, 0], [0, 0, 0.45]), place(string, [0, 0, 0], [0, 0, 0.45]))
}

function mail() {
  const flap = extrude(
    polyShape([
      [-0.9, 0.6],
      [0.9, 0.6],
      [0, -0.12],
    ]),
    0.04,
    0.03,
    mat(C.brand),
  )
  const g = group(
    rbox(1.9, 1.3, 0.28, 0.12, mat(C.porcelain)),
    place(flap, [0, 0, 0.17]),
    place(rbox(1.1, 0.05, 0.04, 0.02, mat(C.mist)), [-0.42, -0.36, 0.15], [0, 0, 0.62]),
    place(rbox(1.1, 0.05, 0.04, 0.02, mat(C.mist)), [0.42, -0.36, 0.15], [0, 0, -0.62]),
    place(ball(0.22, mat(C.coral)), [0.86, 0.6, 0.18]),
  )
  g.userData.tilt = [0.26, -0.45, 0]
  return g
}

function audit() {
  const g = group(
    extrude(shieldShape(), 0.3, 0.07, mat(C.emerald)),
    place(checkMark(mat(C.porcelain), 1.15, 0.12), [0, 0, 0.26]),
  )
  g.userData.tilt = [0.2, -0.42, 0]
  return g
}

function esign() {
  const pen = group(
    place(cyl(0.16, 0.16, 1.1, mat(C.ink)), [0, 0.3, 0]),
    place(torus(0.162, 0.035, gold()), [0, -0.1, 0], [Math.PI / 2, 0, 0]),
    place(torus(0.162, 0.035, gold()), [0, 0.7, 0], [Math.PI / 2, 0, 0]),
    place(cyl(0.16, 0.13, 0.25, mat(C.brandDeep)), [0, -0.38, 0]),
    place(mesh(new THREE.ConeGeometry(0.13, 0.42, 32), gold()), [0, -0.71, 0], [Math.PI, 0, 0]),
    place(rbox(0.06, 0.6, 0.06, 0.03, gold()), [0, 0.5, 0.18]),
  )
  const ink = tube(
    [
      [-0.9, -0.95, 0],
      [-0.65, -0.7, 0.05],
      [-0.45, -1.0, 0.05],
      [-0.2, -0.75, 0.05],
      [0.0, -0.95, 0],
    ],
    0.04,
    mat(C.brand),
  )
  return group(place(pen, [0.1, 0.2, 0], [0, 0, 0.7]), ink)
}

function analytics() {
  const bar = (x: number, h: number, color: string) => place(rbox(0.42, h, 0.42, 0.08, mat(color)), [x, -0.73 + h / 2, 0])
  return group(
    place(rbox(2.0, 0.14, 1.0, 0.06, mat(C.porcelain)), [0, -0.8, 0]),
    bar(-0.6, 0.7, C.cyan),
    bar(0, 1.1, C.violet),
    bar(0.6, 1.55, C.brand),
    tube(
      [
        [-0.9, -0.1, 0.32],
        [-0.6, 0.12, 0.32],
        [0, 0.5, 0.32],
        [0.6, 0.98, 0.32],
        [0.88, 1.08, 0.32],
      ],
      0.045,
      gold(),
    ),
    place(ball(0.1, gold()), [0.88, 1.08, 0.32]),
  )
}

function trophy() {
  const cup = lathe(
    [
      [0, -0.05],
      [0.22, -0.05],
      [0.48, 0.15],
      [0.64, 0.5],
      [0.7, 0.88],
      [0.72, 0.98],
      [0, 0.98],
    ],
    gold(),
  )
  return group(
    cup,
    place(torus(0.28, 0.07, gold(), Math.PI), [-0.66, 0.52, 0], [0, 0, Math.PI / 2]),
    place(torus(0.28, 0.07, gold(), Math.PI), [0.66, 0.52, 0], [0, 0, -Math.PI / 2]),
    place(cyl(0.1, 0.12, 0.36, gold()), [0, -0.22, 0]),
    place(cyl(0.42, 0.48, 0.12, gold()), [0, -0.44, 0]),
    place(rbox(1.0, 0.38, 0.62, 0.08, mat(C.ink)), [0, -0.68, 0]),
    place(rbox(0.5, 0.14, 0.04, 0.03, gold()), [0, -0.68, 0.32]),
  )
}

function clock() {
  const hands = group(
    place(rbox(0.09, 0.5, 0.05, 0.04, mat(C.ink)), [0, 0.22, 0.16]),
    place(rbox(0.09, 0.4, 0.05, 0.04, mat(C.brand)), [0.15, -0.08, 0.17], [0, 0, 2.1]),
    place(ball(0.09, mat(C.coral)), [0, 0, 0.18]),
  )
  const g = group(
    place(cyl(0.95, 0.95, 0.22, mat(C.porcelain)), [0, 0, 0], [Math.PI / 2, 0, 0]),
    place(torus(0.95, 0.11, mat(C.brand)), [0, 0, 0]),
    hands,
  )
  for (let i = 0; i < 12; i++) {
    const a = (i * Math.PI) / 6
    const major = i % 3 === 0
    g.add(
      place(
        rbox(0.05, major ? 0.16 : 0.08, 0.04, 0.02, mat(major ? C.ink : C.mist)),
        [Math.sin(a) * 0.72, Math.cos(a) * 0.72, 0.13],
        [0, 0, -a],
      ),
    )
  }
  g.userData.tilt = [0.2, -0.42, 0]
  return g
}

function funnel() {
  return group(
    lathe(
      [
        [0.16, -0.95],
        [0.16, -0.35],
        [0.82, 0.38],
        [0.88, 0.52],
        [0, 0.52],
      ],
      mat(C.cyan),
    ),
    place(torus(0.86, 0.06, mat(C.brand)), [0, 0.52, 0], [Math.PI / 2, 0, 0]),
    place(ball(0.17, mat(C.coral)), [-0.32, 0.82, 0.1]),
    place(ball(0.17, mat(C.violet)), [0.18, 0.95, -0.1]),
    place(ball(0.17, gold()), [0.4, 0.75, 0.25]),
  )
}

function building() {
  const g = group(
    place(rbox(1.0, 1.9, 0.9, 0.08, mat(C.porcelain)), [-0.25, 0, 0]),
    place(rbox(0.75, 1.15, 0.8, 0.08, mat(C.brand)), [0.6, -0.38, 0]),
    place(rbox(2.1, 0.08, 1.2, 0.04, mat(C.mist)), [0, -0.98, 0]),
  )
  for (let r = 0; r < 4; r++)
    for (let c = 0; c < 2; c++)
      g.add(place(rbox(0.24, 0.24, 0.04, 0.04, mat(C.cyan, { rough: 0.12 })), [-0.47 + c * 0.44, 0.6 - r * 0.42, 0.46]))
  for (let r = 0; r < 2; r++)
    g.add(place(rbox(0.38, 0.18, 0.04, 0.04, mat(C.brandSoft)), [0.6, -0.12 - r * 0.38, 0.41]))
  return g
}

function location() {
  return group(
    lathe(
      [
        [0, -1.0],
        [0.14, -0.72],
        [0.36, -0.36],
        [0.54, 0.0],
        [0.6, 0.3],
        [0.53, 0.6],
        [0.33, 0.82],
        [0, 0.9],
      ],
      mat(C.coral),
    ),
    place(ball(0.23, mat(C.porcelain)), [0, 0.3, 0.46]),
    place(torus(0.46, 0.05, mat(C.brand)), [0, -1.0, 0], [Math.PI / 2, 0, 0]),
  )
}

function palette() {
  const s = new THREE.Shape()
  s.absellipse(0, 0, 1.0, 0.8, 0, Math.PI * 2, false, 0)
  const hole = new THREE.Path()
  hole.absarc(0.42, -0.34, 0.16, 0, Math.PI * 2, true)
  s.holes.push(hole)
  const blob = (x: number, y: number, color: string) => place(ball(0.17, mat(color)), [x, y, 0.1], [0, 0, 0], [1, 1, 0.5])
  const g = group(
    extrude(s, 0.12, 0.05, mat(C.porcelain)),
    blob(-0.5, 0.25, C.coral),
    blob(-0.12, 0.48, C.amber),
    blob(0.34, 0.38, C.emerald),
    blob(-0.55, -0.22, C.brand),
    blob(-0.12, -0.42, C.violet),
  )
  g.userData.tilt = [0.42, -0.4, 0]
  return g
}

function typography() {
  const a = polyShape([
    [-0.8, -0.9],
    [-0.25, 0.9],
    [0.25, 0.9],
    [0.8, -0.9],
    [0.42, -0.9],
    [0.3, -0.48],
    [-0.3, -0.48],
    [-0.42, -0.9],
  ])
  const hole = new THREE.Path()
  hole.moveTo(-0.19, -0.18)
  hole.lineTo(0, 0.45)
  hole.lineTo(0.19, -0.18)
  hole.closePath()
  a.holes.push(hole)
  return group(extrude(a, 0.3, 0.06, mat(C.violet)), place(rbox(0.5, 0.1, 0.1, 0.04, gold()), [0.75, -0.95, 0.1]))
}

function folder() {
  const back = mat(C.gold, { rough: 0.32 })
  return group(
    place(rbox(1.9, 1.35, 0.12, 0.08, back), [0, -0.05, -0.12]),
    place(rbox(0.75, 0.32, 0.12, 0.08, back), [-0.56, 0.62, -0.12]),
    place(rbox(1.6, 1.1, 0.05, 0.03, mat(C.porcelain)), [0, 0.12, -0.02]),
    place(rbox(1.9, 1.1, 0.12, 0.08, mat(C.amber)), [0, -0.2, 0.12], [-0.16, 0, 0]),
  )
}

function sparkle() {
  return group(
    extrude(sparkleShape(1.0), 0.3, 0.06, mat(C.violet)),
    place(extrude(sparkleShape(0.36), 0.14, 0.03, gold()), [0.8, 0.78, 0.1]),
    place(ball(0.12, mat(C.cyan)), [-0.72, -0.62, 0.1]),
  )
}

function inbox() {
  const wall = mat(C.brandSoft)
  return group(
    place(rbox(2.0, 0.14, 1.4, 0.07, mat(C.brand)), [0, -0.42, 0]),
    place(rbox(2.0, 0.44, 0.14, 0.06, wall), [0, -0.24, 0.63]),
    place(rbox(2.0, 0.44, 0.14, 0.06, wall), [0, -0.24, -0.63]),
    place(rbox(0.14, 0.44, 1.4, 0.06, wall), [-0.93, -0.24, 0]),
    place(rbox(0.14, 0.44, 1.4, 0.06, wall), [0.93, -0.24, 0]),
    place(paper(3, C.cyan), [0, 0.3, -0.1], [-0.12, 0, 0], 0.62),
  )
}

function search() {
  return group(
    place(torus(0.55, 0.13, mat(C.brand)), [-0.2, 0.2, 0]),
    place(cyl(0.55, 0.55, 0.05, mat(C.cyan, { opacity: 0.4, rough: 0.05 })), [-0.2, 0.2, 0], [Math.PI / 2, 0, 0]),
    place(cyl(0.13, 0.15, 0.8, mat(C.ink)), [0.48, -0.48, 0], [0, 0, Math.PI / 4]),
  )
}

function bell() {
  return group(
    lathe(
      [
        [0, 0.95],
        [0.12, 0.93],
        [0.24, 0.8],
        [0.36, 0.52],
        [0.46, 0.18],
        [0.6, -0.16],
        [0.74, -0.3],
        [0.76, -0.38],
        [0, -0.38],
      ],
      gold(),
    ),
    place(ball(0.15, mat(C.ink)), [0, -0.5, 0]),
    place(torus(0.12, 0.04, gold()), [0, 1.02, 0]),
    place(ball(0.2, mat(C.coral)), [0.62, 0.62, 0.1]),
  )
}

function link() {
  const a = place(torus(0.5, 0.14, mat(C.brand)), [-0.42, 0, 0], [0, 0, 0], [1.4, 1, 1])
  const b = place(torus(0.5, 0.14, mat(C.cyan)), [0.42, 0, 0.05], [1.05, 0, 0], [1.4, 1, 1])
  const g = group(place(group(a, b), [0, 0, 0], [0, 0, 0.55]))
  g.userData.tilt = [0.2, -0.3, 0]
  return g
}

function lock() {
  const steel = mat(C.steel, { metal: 0.6, rough: 0.22 })
  return group(
    place(rbox(1.3, 1.05, 0.5, 0.12, gold()), [0, -0.3, 0]),
    place(torus(0.42, 0.11, steel, Math.PI), [0, 0.42, 0]),
    place(cyl(0.11, 0.11, 0.3, steel), [-0.42, 0.3, 0]),
    place(cyl(0.11, 0.11, 0.3, steel), [0.42, 0.3, 0]),
    place(cyl(0.12, 0.12, 0.1, mat(C.ink)), [0, -0.2, 0.26], [Math.PI / 2, 0, 0]),
    place(rbox(0.1, 0.26, 0.1, 0.03, mat(C.ink)), [0, -0.38, 0.26]),
  )
}

function workspace() {
  const g = group(
    rbox(2.0, 1.5, 0.14, 0.1, mat(C.porcelain)),
    place(rbox(2.0, 0.3, 0.16, 0.1, mat(C.brand)), [0, 0.6, 0]),
    place(rbox(0.45, 1.0, 0.05, 0.05, mat(C.mist)), [-0.67, -0.18, 0.08]),
    place(rbox(1.15, 0.42, 0.06, 0.06, mat(C.cyan)), [0.3, 0.1, 0.09]),
    place(rbox(1.15, 0.42, 0.06, 0.06, mat(C.violet)), [0.3, -0.42, 0.09]),
  )
  for (let i = 0; i < 3; i++) g.add(place(ball(0.05, mat(C.porcelain)), [-0.86 + i * 0.14, 0.6, 0.09]))
  g.userData.tilt = [0.26, -0.45, 0]
  return g
}

function star() {
  return group(extrude(starShape(5, 1.0, 0.46), 0.3, 0.07, gold()))
}

const BUILDERS: Record<Model3DName, Builder> = {
  brand,
  dashboard: analytics,
  analytics,
  profile,
  candidates,
  team,
  jobs,
  kickoff,
  plans,
  pipeline,
  boards,
  postings,
  attributes,
  stages,
  applications,
  interviews,
  signature,
  referrals,
  settings,
  fields,
  labels,
  mail,
  audit,
  esign,
  trophy,
  clock,
  funnel,
  building,
  location,
  palette,
  typography,
  folder,
  sparkle,
  inbox,
  search,
  bell,
  link,
  lock,
  workspace,
  star,
}

export const DEFAULT_TILT: V3 = [0.34, -0.52, 0]

/**
 * Builds a model wrapped in the shared tilt, centred at the origin and scaled
 * so its on-screen (x/y) extent spans 2 units — every icon fills its frame the
 * same way regardless of depth. Same output for snapshots and live scenes.
 */
export function buildFramedModel(name: Model3DName): THREE.Group {
  const model = BUILDERS[name]()
  const tilt = (model.userData.tilt as V3 | undefined) ?? DEFAULT_TILT
  const tilted = group(model)
  tilted.rotation.set(...tilt)
  tilted.updateMatrixWorld(true)
  const box = new THREE.Box3().setFromObject(tilted)
  const center = box.getCenter(new THREE.Vector3())
  const size = box.getSize(new THREE.Vector3())
  tilted.position.copy(center).multiplyScalar(-1)
  const framed = group(tilted)
  // Slightly under 1 leaves room for perspective growth of the nearest faces.
  framed.scale.setScalar(0.9 / Math.max(size.x / 2, size.y / 2, 0.001))
  return framed
}

/** Frees geometries (materials are shared and cached for the app lifetime). */
export function disposeModel(root: THREE.Object3D) {
  root.traverse(o => {
    if ((o as THREE.Mesh).isMesh) (o as THREE.Mesh).geometry.dispose()
  })
}
