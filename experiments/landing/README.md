# Landing-page experiment — Field Notes (selected)

`variation-b-fieldnotes.html` is the selected direction. It was ported into
the application as the signed-out landing page:

- Component: `src/features/landing/landing-page.tsx`
- Styles: `src/features/landing/landing.css`
- Route: `src/routes/index.tsx`

The other two experiment directions (The Docket, Record Room) were removed
after the owner selected this one.

## Owner decisions applied during selection

- Hero heading changed to "See how local government is changing." (owner
  override of the brief's working copy; `docs/marketing-page.md` updated).
- The gold highlight on "may" was removed; the heading is plain display
  type.

## Concept

A surveyor's traverse across the three planned parishes. The hero fans three
abstract field sheets (unequal rule weights, purple and gold only); the proof
is a vertical traverse line whose four stations activate on scroll while a
gold walker dot travels between markers.

## Typography

- Display: Fraunces (OFL)
- Body: Atkinson Hyperlegible (OFL — designed for low-vision readers,
  on-mission for a civic product)
- Data: IBM Plex Mono (OFL)

Fonts currently load from Google Fonts; self-host before treating the page
as production-final.

## Signature rationale

Stations are a real sequence, so the traverse encodes real structure. The
walker is transform-only. Trust rows carry survey registration marks (`+`)
and the footer has a restrained north mark — surveyor iconography, not civic
seals.

## Implementation notes for the port

- The scroll sequence uses a deterministic rAF-throttled scroll handler:
  a station activates when its top passes 68% of the viewport height, the
  walker moves to the highest activated station, and reaching the page end
  activates all. Activation is permanent; reduced motion shows all stations
  immediately and hides the walker.
- Styles are scoped under `.landing` so they cannot fight app-level element
  styles or Tailwind preflight.
- Motion, touch, focus, and contrast rules follow `docs/design-system.html`.

## What might graduate into `design-system.html`

- Atkinson Hyperlegible body choice for accessibility-forward body text.
- "Planned first" as the honest prelaunch coverage state label.
- The traverse/station pattern as the reference for the Slice 5 decision
  rail on mobile.

## Verification

Checked in Chromium at 320, 375, 414, 768, and 1280 CSS pixels: no
horizontal overflow, hero copy wraps without clipping, primary actions stay
on one line (below 352px the header CTA drops to its own full-width row),
and keyboard order is skip link, brand, header CTA, hero CTA with a visible
focus ring. Reduced-motion mode renders final states immediately.