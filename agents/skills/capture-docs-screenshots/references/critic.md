# Shot critic

The critic is a subagent with fresh context: it sees the artefacts, never the
capturing agent's reasoning, so the shot choice is judged, not defended. Spawn a
new one per round (a resumed critic has seen the earlier round). Each round
returns a verdict per shot: **pass**, or **revise** with one concrete change.
Apply every revise and re-run that round on the revised shots; two rounds
without a pass on a shot → stop and put the disagreement to the user.

## Round 1: the shot plan (before capture)

Hand the critic, per marker:

- the page path, the surrounding section text, and the marker's brief;
- the reader of that page (task step, concept intro, or hub / What's new headline);
- the proposed shot: product state (empty or populated, and with what), route,
  tier, crop, markers (what each points at) with the caption legend, and any
  alternative considered;
- a rough screenshot of the proposed state.

Ask it to judge:

1. **Fit**: does this state answer what the reader needs at this point on the
   page? A step shows where the reader starts; a headline shows the feature at
   work.
2. **Compelling**: is there a stronger state, one that shows the feature
   working rather than waiting? (Example: Chat answering a question beside the
   model beats an empty Chat panel for a What's new headline.)
3. **Focus**: is this the closest crop that still keeps a landmark? Is the tier
   right for the page's purpose?
4. **Markers**: is each one needed (could the prose point at it alone)? Does
   the legend use UI words, in the order the prose mentions them?
5. **Reuse**: does an owner page already plan or hold this shot?

## Round 2: the composed images (before any MDX edit)

Hand the critic the final PNGs, each with its brief, page section, caption,
alt text and the `compose.py` output (warnings, on-page scale). Nothing else.

Ask it to check each criterion below and report, per image, PASS, PASS-WITH-FIX
(caption or alt text only, with the replacement text) or FAIL (retake or
recrop, saying what to change), citing what it sees. The image ships only on a
full pass.

- every item the brief names is visible and readable at its on-page scale, or
  the mismatch is reported (the UI changed, or the brief was wrong);
- markers, if any, sit beside their targets in prose order;
- the crop orients the reader without unrelated UI or dead space, and its edges
  cut no text, avatar, lane or dialog backdrop;
- the UI is settled, light and free of error overlays, cursors and automation UI;
- names, avatars, descriptions and model content look intentional;
- no token, private email, customer data, local path or unrelated account detail
  is visible;
- caption and alt describe what the image shows, in the product's current labels.

Ask it also to list page prose that the images show is out of date.
