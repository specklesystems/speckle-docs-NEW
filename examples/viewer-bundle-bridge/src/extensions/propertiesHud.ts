import {
  Extension,
  SelectionExtension,
  ViewerEvent,
  type IViewer,
  type SelectionEvent
} from '@speckle/viewer'
import { objectProperties, type Bundle } from '../bridge/bundleReader.js'
import { BoxSelectExtension } from './boxSelect.js'

/** Enough to show the lookup worked, not enough to be a property browser. */
const SHOWN = 6

/**
 * Click or box select, see what the producer published about it.
 *
 * The lookup goes to the bundle, not to the object the viewer is holding. That is
 * the round trip the bridge is really for: the viewer hands back an
 * `applicationId`, and the bundle's own eav tables answer to it — including the
 * type-level rows, which live in a separate table and are merged in here.
 *
 * It also means an object the projection drew as an instance proxy, carrying no
 * properties of its own, still has everything its producer wrote about it.
 *
 * Written as an extension so it composes the way the others do: it injects the
 * selection it reads and the box select it also listens to, and owns its own panel
 * rather than being wired up from the app.
 */
export class PropertiesHudExtension extends Extension {
  get inject(): Array<typeof SelectionExtension | typeof BoxSelectExtension> {
    return [SelectionExtension, BoxSelectExtension]
  }

  private readonly element: HTMLElement
  private bundle?: Bundle
  private ids: string[] = []
  private index = 0
  private unpublished = 0

  constructor(
    viewer: IViewer,
    protected selection: SelectionExtension,
    protected boxSelect: BoxSelectExtension
  ) {
    super(viewer, selection, boxSelect)

    this.element = document.createElement('aside')
    this.element.id = 'hud'
    this.element.hidden = true
    this.viewer.getContainer().appendChild(this.element)

    // Delegated, because every render replaces the pager's buttons.
    this.element.addEventListener('click', (event) => {
      const step = (event.target as HTMLElement).dataset?.step
      if (step) this.step(Number(step))
    })

    this.viewer.on(ViewerEvent.ObjectClicked, (event: SelectionEvent | null) => {
      const id = event?.hits[0]?.node?.model?.raw?.applicationId as string | undefined
      this.show(id ? [id] : [])
    })
    this.boxSelect.reportSelectionTo((ids) => this.show(ids))
  }

  /** Called once per load: the tables every later lookup reads. */
  attach(bundle: Bundle): void {
    this.bundle = bundle
    this.show([])
  }

  /**
   * Keep only ids the producer actually published. The projection mints synthetic
   * ids for definition geometry that has no owning object (`def-geo-…`), and those
   * are selectable but answer to nothing in the eav tables — paging through them
   * would offer a page that can only say "nothing here".
   */
  show(ids: string[]): void {
    const known = this.bundle
    this.ids = known ? ids.filter((id) => known.objectKeyByAppId.has(id)) : []
    this.unpublished = ids.length - this.ids.length
    this.index = 0
    this.render()
  }

  clear(): void {
    this.show([])
  }

  private step(by: number): void {
    if (!this.ids.length) return
    // Wrap, so paging a long selection never dead-ends at either edge.
    this.index = (this.index + by + this.ids.length) % this.ids.length
    this.render()
  }

  private render(): void {
    const applicationId = this.ids[this.index]
    if (!this.bundle || !applicationId) {
      this.element.hidden = true
      this.element.innerHTML = ''
      return
    }

    const { scalars, values, instanceCount, typeCount } = objectProperties(
      this.bundle,
      applicationId
    )
    const total = instanceCount + typeCount

    this.element.innerHTML =
      this.pager() +
      `<h3>${escape(String(scalars.name ?? applicationId))}</h3>` +
      `<p class="hud-id">${escape(applicationId)}</p>` +
      rows(
        Object.entries(scalars)
          .filter(([key]) => key !== 'name' && key !== 'speckle_type')
          .map(([key, value]) => [key, String(value)])
      ) +
      (total
        ? `<p class="hud-count">${total} properties · ${instanceCount} instance · ${typeCount} type</p>` +
          rows(values.slice(0, SHOWN)) +
          (values.length > SHOWN
            ? `<p class="hud-count">and ${values.length - SHOWN} more in the bundle</p>`
            : '')
        : '<p class="hud-count">No properties in the bundle for this object.</p>')
    this.element.hidden = false
  }

  /** Only earns its space when the selection holds more than one object. */
  private pager(): string {
    if (this.ids.length < 2) return ''
    // The viewer's count and this one differ on an instanced model, and the gap is
    // worth naming rather than leaving as an apparent miscount.
    const skipped = this.unpublished
      ? `<p class="hud-count">${this.unpublished} more drawn from instance definitions, which publish no properties of their own</p>`
      : ''
    return (
      `<div class="hud-pager">` +
      `<button type="button" data-step="-1" aria-label="Previous object">‹</button>` +
      `<span>${this.index + 1} of ${this.ids.length}</span>` +
      `<button type="button" data-step="1" aria-label="Next object">›</button>` +
      `</div>` +
      skipped
    )
  }
}

function rows(entries: [string, string][]): string {
  if (!entries.length) return ''
  return `<dl>${entries
    .map(([key, value]) => `<dt>${escape(key)}</dt><dd>${escape(value)}</dd>`)
    .join('')}</dl>`
}

function escape(value: string): string {
  return value.replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] ?? c
  )
}
