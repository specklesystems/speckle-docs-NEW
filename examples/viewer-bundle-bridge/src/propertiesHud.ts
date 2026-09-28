import { objectProperties, type Bundle } from './bridge/bundleReader.js'

/** Enough to show the lookup worked, not enough to be a property browser. */
const SHOWN = 6

/**
 * Click an object, see what the producer published about it.
 *
 * The lookup goes to the bundle, not to the object the viewer is holding. That is
 * the round trip the bridge is really for: the viewer hands back an
 * `applicationId`, and the bundle's own eav tables answer to it — including the
 * type-level rows, which live in a separate table and are merged in here.
 *
 * It also means an object the projection drew as an instance proxy, carrying no
 * properties of its own, still has everything its producer wrote about it.
 */
export class PropertiesHud {
  private bundle?: Bundle

  constructor(private readonly element: HTMLElement) {
    this.clear()
  }

  /** Called once per load: the tables every later lookup reads. */
  attach(bundle: Bundle): void {
    this.bundle = bundle
    this.clear()
  }

  show(applicationId: string | undefined): void {
    if (!this.bundle || !applicationId) return this.clear()

    const { scalars, values, instanceCount, typeCount } = objectProperties(
      this.bundle,
      applicationId
    )
    const name = String(scalars.name ?? applicationId)

    const head =
      `<h3>${escape(name)}</h3><p class="hud-id">${escape(applicationId)}</p>` +
      rows(
        Object.entries(scalars)
          .filter(([key]) => key !== 'name' && key !== 'speckle_type')
          .map(([key, value]) => [key, String(value)])
      )

    const total = instanceCount + typeCount
    const body = total
      ? `<p class="hud-count">${total} properties · ${instanceCount} instance · ${typeCount} type</p>` +
        rows(values.slice(0, SHOWN)) +
        (values.length > SHOWN
          ? `<p class="hud-count">and ${values.length - SHOWN} more in the bundle</p>`
          : '')
      : '<p class="hud-count">No properties in the bundle for this object.</p>'

    this.element.innerHTML = head + body
    this.element.hidden = false
  }

  clear(): void {
    this.element.hidden = true
    this.element.innerHTML = ''
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
