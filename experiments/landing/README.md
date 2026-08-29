# Landing-page experiments

Three standalone marketing-page directions built from
`docs/marketing-page.md` and `docs/design-system.html`. Open
`index.html` in a browser to compare, or serve the repo root and visit
`/experiments/landing/`.

These are prototypes only. They are not routed into the TanStack Start app
and ship no behavior claims. The selected direction graduates into React
components in a later slice.

## Shared guarantees (all variations)

- Exact copy from the brief: hero heading, supporting copy, `Follow the
  build` action to `https://github.com/LaykenV/public-parish`, four proof
  steps, trust copy, coverage copy, and the footer provenance line.
- Four-part structure: hero, product proof, trust and coverage, footer. No
  added sections.
- Palette tokens from `design-system.html` used as `oklch()` values.
- Placeholder mark inlined as SVG; the name is live text, never raster.
- `overflow-x: clip` on the document; no page-level horizontal overflow.
- 44px minimum touch targets; visible focus rings; skip link; logical tab
  order.
- Two motion moments only: hero entrance and evidence sequence. Transform
  and opacity only.
- `prefers-reduced-motion` shows final states immediately and disables the
  auto-advancing evidence sequence (steps remain tappable).
- Evidence sequence text exists in the document and reads without
  JavaScript. Entrances are gated behind an `html.js` class so a no-JS page
  is complete.
- Auto-advance plays one full 1-4 cycle then rests on the final step. It
  pauses while the proof section is hovered or focused and while the tab is
  hidden, and any manual selection stops it. No endless loops.

## Variation A — The Docket

`variation-a-docket.html`

- Concept: a record being annotated. The hero's own supporting copy carries
  three phrase underlines (purple, gold, cypress) tied by thin connector
  lines to three anchor plates. The proof is one record sheet that scans,
  receives evidence brackets, gains reader ticks and a question mark, then
  accepts an outcome strip.
- Typography: Newsreader (display, OFL), Public Sans (body, OFL — designed
  for US government digital services), Spline Sans Mono (data, OFL).
- Signature rationale: "evidence stays beside the claim" rendered
  literally; ties are the product mechanic, not decoration. Ties hide below
  60rem where plates become a stacked list.
- Notes: tie lines are drawn by JS into an SVG overlay after
  `document.fonts.ready` and on resize; the page is complete without them.

## Variation B — Field Notes

`variation-b-fieldnotes.html`

- Concept: a surveyor's traverse across the three planned parishes. The
  hero fans three abstract field sheets (unequal rule weights, purple and
  gold only); the proof is a vertical traverse line whose four stations
  activate on scroll while a gold walker dot travels between markers.
- Typography: Fraunces (display, OFL), Atkinson Hyperlegible (body, OFL —
  designed for low-vision readers, on-mission for a civic product), IBM Plex
  Mono (data, OFL).
- Signature rationale: stations are a real sequence, so the traverse encodes
  real structure; the walker is transform-only.
- Trust rows carry survey registration marks (`+`) and the footer has a
  restrained north mark. Both are surveyor iconography, not civic seals.

## Variation C — Record Room

`variation-c-record-room.html`

- Concept: an evidence inspection room. Dark plum (ink token) carries the
  page; the trust section flips to paper as the plain-language contract.
  Gold inspection brackets frame the heading exhibit and recur around the
  specimen sheet. The proof sheet morphs through the four stages; step
  cards sit in a vertical list on desktop and a native horizontal snap rail
  on mobile (next card peeks, scroll-snap proximity, no vertical hijack).
- Typography: Bricolage Grotesque (display, OFL), Instrument Sans (body,
  OFL), JetBrains Mono (data, OFL).
- Contrast adaptations: on the dark background the palette uses a lifted
  muted text (`oklch 79%`), a lifted cypress for evidence marks, and gold
  focus rings; purple appears only as button fills with paper text. These
  tints are proposed additions for a dark section, not palette changes.
- Mobile rail satisfies the design system's horizontal rail contract and
  previews the Slice 5 decision-rail behavior.

## Dependencies

None added. Plain HTML, CSS, and a small inline script per file. Fonts load
from Google Fonts (OFL) for comparison only; self-host before production.
No component or motion library was needed.

## What might graduate into `design-system.html`

- The anchor-plate tie motif (A) or inspection brackets (C) as the product's
  evidence-affordance motif.
- The abstract record-sheet stage language (bars, brackets, ticks, outcome
  strip) for the decision card's loading and limited states.
- C's mobile step rail as the reference implementation of the horizontal
  rail contract.
- B's Atkinson Hyperlegible body choice for accessibility-forward body
  text.
- "Planned first" as the honest prelaunch coverage state label.

## Verification

Checked in Chromium at 320, 375, 414, 768, and 1280 CSS pixels: no
horizontal overflow (`scrollWidth` equals `clientWidth` on every page),
hero copy wraps without clipping, primary actions stay on one line (below
352px the header CTA drops to its own full-width row), step controls exceed
44px, keyboard order is skip link, brand, header CTA, hero CTA, then steps
with a visible focus ring, and the evidence stages switch by click and by
one auto-advance cycle. Reduced-motion mode renders final states with the
auto-advance disabled (standard media-query block from the design system;
re-verify on a device if deep-testing motion).