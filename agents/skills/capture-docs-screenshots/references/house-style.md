# Product shot house style

`scripts/compose.py` holds every style value (marker colour and size, hero
margin, radius, shadow, legibility floors). This file holds the rules for using
it. Change a value there, a rule here.

## Pick the tier by purpose

| Tier | Use | Treatment | On-page UI scale |
|---|---|---|---|
| **hero** | What's new items, page intros: the feature at work | Transparent margin, rounded corners and soft shadow on visible edges; the crop runs off one or two `bleed` edges | ≥ 0.5 |
| **region** | Most instructional shots: one panel, flow or result | The crop as-is; the docs `<Frame>` supplies border and radius | ≥ 0.6 |
| **element** | One control, menu or dialog | Crop as-is, widened with neighbouring UI to fill the frame | ≥ 0.9 |

A whole-screen orientation tour (`"tour": true`) is a region shot with a floor
of 0.4: use one per surface, and close-ups for everything after it.

Every shot fills the Frame's full width (~640 CSS px); `compose.py` prints the
on-page scale, column width ÷ crop width. Above 1.5 the UI looks magnified:
widen the crop with neighbouring UI rather than shrinking the image.
Aim near 1×: a shot that only passes because it sits just under the 1.5
ceiling is too zoomed. Widen it.

## Choose clean, lively content

- **Hiding rows is not cropping.** A list shows a contiguous run from its top,
  or a state reached with the product's own filter, search or status chip.
  Never cut rows out of the middle.
- **Real people.** Prefer the capturing account's own row; crop out author,
  creator and email columns the brief does not name. No emails, ever.
- **Variety.** Timelines and activity feeds read better scrolled to a stretch
  with several people and dates (the project activity timeline scrolled left)
  than a run of identical initials.
- **Never open lists of other organisations.** Workspace switchers, join
  dialogs and similar pickers can list customer or partner workspaces; don't
  open the submenu, or crop to entries that are safe to publish.
- When the demo data has no clean state for a shot, keep the existing image or
  the marker and report the data that needs tidying.

## Crop close

Close-ups are the default: crop to the subject the brief names.

- **Landmark.** Keep one recognisable piece of surrounding UI (header, sidebar
  edge, panel title) so the reader can place the crop. When nothing fits, the
  page needs an earlier orientation shot of that surface; check it exists or add
  a marker for it.
- **Clean edges.** Crop between words, rows and controls, never through text,
  an avatar or a timeline lane. A crop that ends in empty page margin reads as a
  blank or broken pane: end it on the next content edge (a card border is
  enough) instead.
- **Dialogs crop to their bounds.** A dimmed backdrop around a dialog shows
  fragments of the page behind; crop to the dialog edge.
- **Landscape, always.** No fixed aspect ratio, but never taller than wide: a
  toolbar is a short letterbox strip, a dialog or menu is landscape or square.
  A tall subject gets a wider, shorter crop (more columns, fewer rows), not a
  portrait image; a narrow panel uses `inset`, which pads it to at least square.
  Bias toward landscape even when a tighter portrait crop would be legal on scale.
- A narrow subject (a sidebar, a tree column) runs magnified at column width:
  widen it with the neighbouring UI that explains it. When the neighbouring UI
  would be cut text or empty margin (a sidebar beside page content), set
  `"inset": true` instead: the panel floats uncut at 1.5× on a transparent
  margin with the hero edge treatment; `bleed` marks an edge where it continues.
- Capture density limits the zoom: a 2× capture shows true size at most. A
  smaller subject needs a closer capture, not an enlarged crop.

## Numbered markers, legend in the caption

- Mark only what the reader must find and the prose cannot point at alone;
  many shots need none. Six markers means split the shot.
- Each marker sits beside its control, never on it, in the order the prose
  mentions them. The colour (magenta) is outside the Speckle UI palette so it
  never reads as product UI; the white ring keeps it visible on any background.
- The Frame `caption` is the legend: `1 Open Chat with your model · 2 Your question`.
  Use the product's UI words. Text stays out of the pixels, so it is
  searchable, translatable and survives UI copy changes without a re-render.
- Alt text describes the product state; it does not repeat the legend.
- Write caption and alt from the composed image, not from the brief: name only
  what is visible, in the product's current labels. When a retake changes a crop,
  check the existing caption and alt still match.

## Light theme only

Every published shot shows the product in light theme, whatever the reader's
docs theme. Dark captures are as easy to automate, but one canonical look keeps
the help system, support replies and exports consistent, and a single asset per
state halves retakes. Ship one light asset per state; no dark variants or
theme-swapped image pairs.

Hero margins are transparent, so the docs page's own background shows through
in both docs themes; region and element shots are the UI itself and carry no
canvas.

## Every `compose.py` warning is an audit failure

Low on-page scale, overlapping markers, markers outside the crop, too many
markers, an element wider than the column: adjust the spec and re-run, or
justify the exception in the report.
