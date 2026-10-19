# Capture backends

Every backend must yield a **lossless PNG of a 1440 × 900 CSS-px viewport at 2×**
(2880 × 1800). Record `innerWidth`, `innerHeight` and `devicePixelRatio` before
each capture; anything else is a failed preflight.

**Narrower viewport, by exception.** A full-width strip or a modal can be
captured at a viewport down to 1024 CSS px wide when that keeps it legible at
column width. First check the layout does not reflow: panels that move below
the fold or tables that scroll sideways mean the reader never sees that layout,
so stay at 1440 and use the hero tier instead. Record the viewport in the report.

## Playwright (local deployment)

Preferred whenever **open-dev-speckle-in-browser** owns the session:
viewport 1440 × 900 with `deviceScaleFactor: 2`, then
`playwright-cli screenshot --filename <abs>.png` (viewport, never full page).

### Attaching to an engineer's dev server

Their server, their state: read only. Use their URL, their signed-in session or
an existing seeded test user, and leave services, seed data and config as found.
Dev builds add UI of their own: hide the Nuxt DevTools launcher with the overlay
snippet below. A Vite or Nuxt error overlay is a real error, not chrome: stop and
report it rather than hiding it.

## Claude in Chrome (signed-in production, staging or an engineer's dev server)

The user's own Chrome, already signed in. Its plain `screenshot` (even with
`save_to_disk`) returns a downscaled JPEG: never ship it. Use zoom tiles.

1. **Viewport.** `resize_window` sets the outer window. Read
   `outerHeight - innerHeight` with `javascript_tool`, then resize to
   `1440 × (900 + that delta)` and re-check `innerWidth/innerHeight` = 1440/900.
2. **Force light mode.** Speckle's frontend uses Nuxt color mode, stored in
   `localStorage['nuxt-color-mode']` (`system` | `light` | `dark`). Save the
   current value, set `light`, reload, then check the class:

   ```js
   sessionStorage.setItem('docs-cap-prev-color-mode', localStorage.getItem('nuxt-color-mode') ?? 'system')
   localStorage.setItem('nuxt-color-mode', 'light'); location.reload()
   // after reload:
   document.documentElement.classList.contains('light')   // must be true
   ```

   Re-check the class right before every tile batch. Restore the saved value
   when the batch is done. (Playwright: `colorScheme: 'light'` on the context
   does the same without touching storage.)
3. **Hide automation and dev overlays** (re-run after every navigation):

   ```js
   let s = document.getElementById('docs-cap') ?? document.head.appendChild(Object.assign(document.createElement('style'), { id: 'docs-cap' }))
   s.textContent = '#claude-phantom-cursor,#claude-agent-glow-border,.profiler-dock,.profiler-heap-dock,.intercom-lightweight-app,#intercom-frame,#nuxt-devtools-container,grammarly-desktop-integration,[data-lastpass-icon-root],[data-lastpass-root]{display:none!important}*{cursor:none!important}'
   document.activeElement?.blur()
   ```

   The phantom cursor and glow border are the extension's own UI; the profiler
   docks, Intercom launcher and Nuxt DevTools launcher are app overlays; Grammarly and
   LastPass inject into the user's own Chrome (1Password and similar do the same). List any new body-level
   overlay with
   `[...document.body.children].map(e => e.tagName + '#' + e.id + '.' + e.className)`
   and add it here.
4. **Park the pointer.** Hiding the cursor leaves its hover state behind
   (highlighted table rows, tooltips, the viewer's settings gear opens Layout).
   Hover an inert spot such as empty header space, take one screenshot to check
   nothing is highlighted or open, then tile. Row actions (`…`) often appear
   only on hover: hover the row, then click the button, and check the menu is
   still open before tiling.
5. **Tiles.** Note the screenshot's coordinate frame (e.g. `1389x868`). Zoom a
   3 × 3 even grid of that frame with `save_to_disk: true, scale: 1`; each tile
   returns ~960 px wide, which is native 2× resolution. Larger regions come
   back downscaled. Batch the zooms in one `browser_batch` so the UI cannot
   change between tiles. Zoom only the tiles the planned crop touches and pass
   `-` for the rest.
6. **Confirm the tiles landed.** `save_to_disk` writes to a temp dir the
   result names; check those files exist from the shell before stitching. In
   some environments the extension's saves are not readable from the shell: then
   use Playwright on the same machine, or ask the user for a native screenshot.
7. **Stitch**: `scripts/stitch.py out.png <frameW> <frameH> 1440 900 2 3 3 <tiles…>`
   (row-major). Warns if a tile was downscaled.

The tiles land in the session's temp dir, not the user's machine: run stitch and
compose there, then copy the final PNG into the docs repo.
