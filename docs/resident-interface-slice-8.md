# Resident interface Design Slice 8

Status: deployed through PR #43 as `85d6947` on August 31, 2026. Production
workflow `33454522729` and the independent production smoke passed. Later
releases connected accepted issue, evidence, anonymous Ask, Google account, and
private saved-setup adapters.

## What this slice closes

The resident pages now behave as one application instead of a set of finished
screens. A typed `returnTo` value carries the exact resident route and public
search state into issue, decision, meeting, and Ask views. The parser accepts
only bounded Public Parish paths. It rejects absolute URLs, protocol-relative
URLs, unknown routes, backslashes, and oversized values.

Development journeys carry the matching evidence scenario across route
boundaries. Production still ignores presentation fixtures and keeps every
unfinished provider action behind its existing availability gate.

The visible change is deliberately small. Following gives a resident a written
`Open changed issue` action beside the latest material update. A degraded
coverage row offers `Request coverage`. Both controls use the existing
ledger and action treatments. The evidence gutter remains the only prominent
visual signature.

## Connected flow record

| Flow | Connected proof |
| --- | --- |
| Choose an area, open an issue, inspect a Source | Home issue links carry `fixture=preview` and return to the same Home state. |
| Filter Explore, open a decision, return through its issue | Decision links retain every Explore query and filter. The related issue returns to the decision record. |
| Ask two issue questions and inspect an answer Source | The in-memory question handoff now carries a safe return route. Ask returns to the same fixture-backed issue. |
| Follow through Google | The existing flow keeps the target and cadence through its Google return state. |
| Follow through email-only verification | The existing sheet keeps email entry, code, confirmation, target, cadence, and destination in one overlay. |
| Open an alert, inspect What changed, inspect a Source | Following links the drainage update to `fixture=update`; the issue announces the accepted update and returns to Following. |
| Inspect degraded coverage and request coverage | Each degraded body links to the development coverage-request form without starting compiler work. |
| Report a source problem privately | Issue, decision, and meeting pages keep the record URL attached and return focus to the record. |
| Return with a stored area | The existing local area store replaces the hero with `Watching [area]` and puts the feed first. |
| Complete filters, Source, and Follow with a keyboard | Slice 7 focus, target, sheet, and reduced-motion contracts remain unchanged. The new written links use 44-pixel targets. |

## Fixture and API ownership

`src/features/resident-handoff/contracts.ts` is the implementation handoff. It
names all 14 sitemap destinations, their typed page contract, current readiness
gate, fixture owner, and future API owner. It also names every fixture-backed
write and the backend that must replace it.

At the Slice 8 checkpoint, the gates were:

- Home, For You, and Explore are partially connected to accepted atomic
  publications. Ranked issue feeds are not live.
- Issue, decision detail, meeting, Ask, Following, Coverage, coverage request,
  private reporting, and email management remain unavailable in production.
- How Public Parish works is static published method copy.

Later releases made accepted issue, decision, meeting, citation, bounded
anonymous Ask, Google account, and private saved-setup paths live. Follow,
email, coverage-request, and private-report actions remain gated. No fixture
interaction counts as production proof.

## Implementation inventory

The final route inventory is `/`, `/for-you`, `/explore`, `/ask`, `/coverage`,
`/coverage/request`, `/issues/$issueSlug`, `/decisions/$recordKey`,
`/meetings/$meetingId`, `/how-it-works`, `/privacy`, the three Following views,
and `/email/manage/$token`.

The shared component registry remains the one recorded in Slice 7. Slice 8
changes navigation data passed to Issue card, result row, upcoming item,
timeline, related issue, Ask scope, Following row, Back link, and coverage row.
It adds no primitive, icon, font, color, radius, shadow, or motion token.

The active visual tokens remain paper `#FAFAF9`, card `#FFFFFF`, ink `#171717`,
river blue `#315BEA`, evidence green `#10B981`, warning amber `#F59E0B`, and
muted ink `#686864`. Inter remains the interface face and Geist Mono remains
the receipt and date face.

## Review evidence

The shared browser completed these current-diff journeys at 1280 by 800 CSS
pixels with no page overflow:

- Explore with a record-type filter to `CO-022-2026`, then its related issue;
- issue question handoff to Ask with the complete issue return route;
- Following to the changed drainage issue, the live update announcement, What
  changed, and its selected Source;
- first-visit Home to stored Lafayette area and compact returning Home;
- degraded Coverage to the request action;
- issue Follow with equal 44-pixel Google and email-only actions.

The new Following links measured 44 CSS pixels tall. The selected Source stayed
in the URL and the exact excerpt rendered in the desktop evidence rail. The T3
preview also stripped an absolute external `returnTo` value and restored the
normal Explore destination. The same issue address without a development
fixture rendered the honest not-found state instead of fixture evidence. The T3
preview kept DOM automation available, but its screenshot, recording, and
viewport-resize controls timed out during this review. Slice 7's existing
browser record remains the latest six-width proof for the unchanged responsive
grid and shared overlays. Pull-request CI owns automated tests, typecheck,
build, prerender, and lint under the repository validation rule.

The final PR checks passed on head `09cc5cb`. PR-Agent reported no major or
security issues. Its one earlier continuity finding was real: a record-to-record
detour preserved only one Back step. Commit `46ef84e` retained the bounded
nested origin, and the shared browser replayed filtered Explore to decision to
related issue and back to the exact filtered Explore state. The final follow-up
kept the `update` evidence scenario across discovery and meeting links, held a
wrapped Following link to a 44-pixel target, and aligned the degraded-row action
with the written `Request coverage` vocabulary.

## Final critique

The resident UI does not need another decorative idea. The evidence gutter is
specific to Public Parish and already carries the product's strongest visual
claim. Slice 8 spends its design work on continuity. A resident returns to the
same filter, same record, same scope, and same follow list. The new links state
exactly what opens. No tour, progress map, completion meter, or fixture banner
was added.
