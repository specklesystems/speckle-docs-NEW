import { propertiesOf, scalarsOf, type Bundle } from './bridge/bundleReader.js'

/**
 * Click an object, see what the producer published about it.
 *
 * The lookup goes to the bundle, not to the object the viewer is holding. That is
 * the round trip the bridge is really for: the viewer hands back an
 * `applicationId`, and the bundle's own eav tables answer to it — including the
 * type-level rows, which live in a different table and are merged in here.
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

    const scalars = scalarsOf(this.bundle, applicationId)
    const groups = group(propertiesOf(this.bundle, applicationId))

    if (!Object.keys(scalars).length && !groups.size) {
      this.element.innerHTML =
        `<h3>${escape(applicationId)}</h3>` +
        `<p class="hud-empty">Nothing in the bundle for this applicationId.</p>`
      this.element.hidden = false
      return
    }

    const properties = [...groups]
      .map(([path, rows]) => (path ? `<h4>${escape(path)}</h4>` : '') + section(rows))
      .join('')

    this.element.innerHTML =
      `<h3>${escape(String(scalars.name ?? applicationId))}</h3>` +
      `<p class="hud-id">${escape(applicationId)}</p>` +
      section(
        Object.entries(scalars)
          .filter(([key]) => key !== 'name')
          .map(([key, value]) => [key, String(value)])
      ) +
      properties
    this.element.hidden = false
  }

  clear(): void {
    this.element.hidden = true
    this.element.innerHTML = ''
  }
}

/**
 * Group leaves under the path that holds them. A Revit object nests four deep, so
 * repeating `Parameters.Type Parameters.Analytical Properties.` on every row buries
 * the part that differs.
 */
function group(value: Record<string, unknown>): Map<string, [string, string][]> {
  const groups = new Map<string, [string, string][]>()

  const walk = (node: Record<string, unknown>, path: string): void => {
    for (const [key, child] of Object.entries(node)) {
      if (child && typeof child === 'object' && !Array.isArray(child)) {
        walk(child as Record<string, unknown>, path ? `${path}.${key}` : key)
      } else {
        const rows = groups.get(path)
        if (rows) rows.push([key, String(child)])
        else groups.set(path, [[key, String(child)]])
      }
    }
  }

  walk(value, '')
  return groups
}

function section(rows: [string, string][]): string {
  if (!rows.length) return ''
  return `<dl>${rows
    .map(([key, value]) => `<dt>${escape(key)}</dt><dd>${escape(value)}</dd>`)
    .join('')}</dl>`
}

function escape(value: string): string {
  return value.replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] ?? c
  )
}
