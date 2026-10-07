import * as THREE from 'three'
import { buildFramedModel, disposeModel } from './models'
import { peekIcon, storeIcon } from './cache'
import { addStudioLighting, STUDIO_EXPOSURE, STUDIO_TONE_MAPPING } from './studio'
import type { Model3DName } from './meta'

/**
 * One shared offscreen WebGL renderer turns each 3D model into a still image
 * exactly once; every <Icon3D> on every page reuses that image. This keeps the
 * whole app at a single WebGL context no matter how many icons are on screen.
 */
const SIZE = 256

type Stage = {
  renderer: THREE.WebGLRenderer
  scene: THREE.Scene
  camera: THREE.PerspectiveCamera
}

let stage: Stage | null = null
let queue: Promise<unknown> = Promise.resolve()
const pending = new Map<Model3DName, Promise<string>>()

function getStage(): Stage {
  if (stage) return stage
  const canvas = document.createElement('canvas')
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true })
  renderer.setPixelRatio(1)
  renderer.setSize(SIZE, SIZE, false)
  renderer.setClearColor(0x000000, 0)
  renderer.toneMapping = STUDIO_TONE_MAPPING
  renderer.toneMappingExposure = STUDIO_EXPOSURE
  renderer.outputColorSpace = THREE.SRGBColorSpace
  const scene = new THREE.Scene()
  addStudioLighting(scene, renderer)
  const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 50)
  camera.position.set(0, 0, 4.55)
  camera.lookAt(0, 0, 0)
  stage = { renderer, scene, camera }
  return stage
}

function renderNow(name: Model3DName): string {
  const { renderer, scene, camera } = getStage()
  const model = buildFramedModel(name)
  scene.add(model)
  renderer.render(scene, camera)
  const webp = renderer.domElement.toDataURL('image/webp', 0.92)
  const url = webp.startsWith('data:image/webp') ? webp : renderer.domElement.toDataURL('image/png')
  scene.remove(model)
  disposeModel(model)
  return url
}

/** Resolves to a cached image URL for the model, rendering it at most once. */
export function renderIcon(name: Model3DName): Promise<string> {
  const cached = peekIcon(name)
  if (cached) return Promise.resolve(cached)
  const inflight = pending.get(name)
  if (inflight) return inflight
  // Serialise renders and yield between them so a page full of icons never blocks a frame for long.
  const job = queue.then(
    () =>
      new Promise<string>((resolve, reject) => {
        const run = () => {
          try {
            const url = renderNow(name)
            storeIcon(name, url)
            resolve(url)
          } catch (err) {
            reject(err)
          } finally {
            pending.delete(name)
          }
        }
        if ('requestIdleCallback' in window) window.requestIdleCallback(run, { timeout: 120 })
        else setTimeout(run, 0)
      }),
  )
  queue = job.catch(() => undefined)
  pending.set(name, job)
  return job
}
