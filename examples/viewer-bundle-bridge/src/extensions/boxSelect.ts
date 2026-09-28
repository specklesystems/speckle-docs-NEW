import {
  CameraController,
  Extension,
  SelectionExtension,
  type IViewer,
  type TreeNode
} from '@speckle/viewer'

/**
 * Drag a rectangle to select everything inside it.
 *
 * This is an ordinary custom extension written against public Viewer API, and the
 * Speckle web app does not ship it — which is the point. If a box select written
 * from scratch works on a bundle that came through the bridge, the Viewer 2 API
 * surface as a whole works on 2026.9 data, not just the paths Speckle exercises.
 *
 * The ids it hands back are `applicationId` values, because that is what the
 * projection sets `id` to.
 */
export class BoxSelectExtension extends Extension {
  get inject(): Array<typeof SelectionExtension | typeof CameraController> {
    return [SelectionExtension, CameraController]
  }

  private box?: HTMLDivElement
  private origin?: { x: number; y: number }
  private readonly listeners: ((ids: string[]) => void)[] = []

  constructor(
    viewer: IViewer,
    protected selection: SelectionExtension,
    protected camera: CameraController
  ) {
    super(viewer, selection, camera)
    this._enabled = false

    const container = this.viewer.getContainer()
    container.addEventListener('pointerdown', this.onPointerDown)
    container.addEventListener('pointermove', this.onPointerMove)
    container.addEventListener('pointerup', this.onPointerUp)
  }

  get enabled(): boolean {
    return this._enabled
  }

  /** Orbit and box drag are the same gesture, so the camera yields while this is on. */
  set enabled(value: boolean) {
    this._enabled = value
    this.camera.enabled = !value
  }

  /** More than one listener: the status line and the properties panel both want these. */
  reportSelectionTo(listener: (ids: string[]) => void): void {
    this.listeners.push(listener)
  }

  private onPointerDown = (event: PointerEvent): void => {
    if (!this._enabled) return
    this.origin = { x: event.clientX, y: event.clientY }
    this.box = document.createElement('div')
    this.box.style.cssText =
      'position:fixed;border:1px solid #136cff;background:rgba(19,108,255,0.15);pointer-events:none;z-index:10'
    document.body.appendChild(this.box)
  }

  private onPointerMove = (event: PointerEvent): void => {
    if (!this.origin || !this.box) return
    const { x, y } = this.origin
    Object.assign(this.box.style, {
      left: `${Math.min(x, event.clientX)}px`,
      top: `${Math.min(y, event.clientY)}px`,
      width: `${Math.abs(event.clientX - x)}px`,
      height: `${Math.abs(event.clientY - y)}px`
    })
  }

  private onPointerUp = (event: PointerEvent): void => {
    if (!this.origin) return
    const { x, y } = this.origin
    this.box?.remove()
    this.box = undefined
    this.origin = undefined

    const ids = this.idsInside({
      left: Math.min(x, event.clientX),
      right: Math.max(x, event.clientX),
      top: Math.min(y, event.clientY),
      bottom: Math.max(y, event.clientY)
    })
    this.selection.selectObjects(ids)
    for (const listener of this.listeners) listener(ids)
  }

  /**
   * Project each render view's bounds centre and keep the ones inside the
   * rectangle. Bounds centres are approximate on purpose: a sample should show the
   * shape of the problem, not a production hit test.
   */
  private idsInside(rect: { left: number; right: number; top: number; bottom: number }): string[] {
    const camera = this.viewer.getRenderer().renderingCamera
    if (!camera) return []
    const bounds = this.viewer.getContainer().getBoundingClientRect()
    const ids = new Set<string>()

    this.viewer.getWorldTree().walk((node: TreeNode) => {
      const view = node.model.renderView
      // Not every render view carries bounds — a view with no drawable geometry
      // has none, and reading through it is the quickest way to break a box select.
      const aabb = view?.aabb
      if (!aabb) return true
      const point = project(
        (aabb.min.x + aabb.max.x) / 2,
        (aabb.min.y + aabb.max.y) / 2,
        (aabb.min.z + aabb.max.z) / 2,
        camera.matrixWorldInverse.elements,
        camera.projectionMatrix.elements
      )
      if (!point) return true

      const screenX = bounds.left + (point.x * 0.5 + 0.5) * bounds.width
      const screenY = bounds.top + (-point.y * 0.5 + 0.5) * bounds.height
      if (
        screenX >= rect.left &&
        screenX <= rect.right &&
        screenY >= rect.top &&
        screenY <= rect.bottom
      ) {
        const owner = atomicAncestor(node)
        if (owner) ids.add(owner)
      }
      return true
    })

    return [...ids]
  }
}

/** The applicationId of the object a render view belongs to. */
function atomicAncestor(node: TreeNode): string | undefined {
  let current: TreeNode | null = node
  while (current) {
    if (current.model.atomic && current.model.raw?.applicationId) {
      return String(current.model.raw.applicationId)
    }
    current = current.parent
  }
  return undefined
}

/**
 * World point to normalised device coordinates, by hand. Doing the matrix maths
 * here rather than importing three keeps the sample to one copy of three — the one
 * inside the viewer — because two copies break every `instanceof` the viewer does.
 */
function project(
  x: number,
  y: number,
  z: number,
  view: ArrayLike<number>,
  projection: ArrayLike<number>
): { x: number; y: number } | undefined {
  const apply = (m: ArrayLike<number>, v: number[]): number[] => [
    m[0] * v[0] + m[4] * v[1] + m[8] * v[2] + m[12] * v[3],
    m[1] * v[0] + m[5] * v[1] + m[9] * v[2] + m[13] * v[3],
    m[2] * v[0] + m[6] * v[1] + m[10] * v[2] + m[14] * v[3],
    m[3] * v[0] + m[7] * v[1] + m[11] * v[2] + m[15] * v[3]
  ]

  const clip = apply(projection, apply(view, [x, y, z, 1]))
  // Behind the camera: no meaningful screen position.
  if (clip[3] <= 0) return undefined
  return { x: clip[0] / clip[3], y: clip[1] / clip[3] }
}
