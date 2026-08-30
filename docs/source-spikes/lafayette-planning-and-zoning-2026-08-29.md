# Lafayette planning and zoning source spike

Checked August 29, 2026. This is a source-onboarding note, not a claim that
Public Parish supports these bodies.

## Recommendation

Do not add Lafayette planning or zoning records to the production City Council
registry. The official source map identifies several separate public bodies,
but the agenda and result links do not yet pass the direct-link coverage gate.

Create separate registries for each body after a complete recent meeting-cycle
replay:

- Lafayette Parish Planning Commission;
- Lafayette City Planning Commission;
- Lafayette City Zoning Commission;
- Lafayette Board of Zoning Adjustment;
- Lafayette Hearing Examiner.

The current City Council registry accepts the same official domains used by
some planning sources. Domain allowlisting alone cannot establish the public
body. Every candidate source needs body evidence before retrieval and model
work.

## Official roots and body definitions

- [Planning and Development](https://www.lafayettela.gov/business-development/planning-and-development/)
  is the official root.
- [Planning Commission](https://www.lafayettela.gov/business-development/planning-and-development/planning-commission/)
  says the Parish Planning Commission meets on the second Monday and the City
  Planning Commission meets on the third Monday.
- [Rezoning](https://www.lafayettela.gov/business-development/planning-and-development/zoning-in-lafayette/rezoning/)
  describes the City Zoning Commission and its handoff to the City Council for
  a final decision.
- [Board of Zoning Adjustment](https://www.lafayettela.gov/business-development/planning-and-development/board-of-zoning-and-adjustment/)
  describes BOZA as a separate final authority.
- [Platting and subdivisions](https://www.lafayettela.gov/business-development/planning-and-development/planning-zoning-and-development-applications/platting-and-subdivisions/)
  describes Hearing Examiner actions and later planning-commission
  ratification.

## Live schedule documents

These official-site CDN documents returned PDF responses during the check:

- [2026 City Planning Commission schedule](https://media-002-us.cdn.govstack.com/lafayettela-us/media/vfpb55hg/2026-city-planning-commission-schedule.pdf)
- [2026 Parish Planning Commission schedule](https://media-002-us.cdn.govstack.com/lafayettela-us/media/evrhzvry/2026-parish-planning-commission-schedule.pdf)
- [2026 Zoning Commission calendar](https://media-002-us.cdn.govstack.com/lafayettela-us/media/mhhkiz1v/2026-zoning-commission-meetings.pdf)
- [2026 BOZA dates](https://media-002-us.cdn.govstack.com/lafayettela-us/media/0jamoijd/boza-meeting-and-deadline-dates-2026.pdf)

If the CDN is allowlisted later, constrain it to the
`/lafayettela-us/media/` tenant prefix. Do not treat the shared CDN hostname as
sufficient proof of ownership.

## Failure modes found

- Previously indexed agenda and action-summary URLs under
  `/docs/default-source/` now return 404. Search results still expose cached
  text, so discovery can appear successful while the source link is broken.
- The BOZA `Agenda` link opens a blank generic `/parsers/events/` page.
- `events.lafayettela.gov` returned 502 from the check environment.
- The schedule PDFs have opaque CDN identifiers and duplicate legacy copies.
- The four live calendar files shared an August 18 `Last-Modified` value. That
  may be a site-migration date and cannot prove a substantive revision.
- The schedules contain apparent date errors, including 2025 dates in a 2026
  row and a deadline later than its listed meeting.
- Council document search mixes City Council, Parish Council, and Joint Council
  material for one meeting date.
- The council portal's planning query did not return tested commission case
  labels. Linking a commission case to a later council ordinance needs a stable
  identifier or cited document-content match.

## Candidates worth watching

The [Lafayette Parish Growth Plan](https://www.lafayettela.gov/project-pages/lafayette-growth-plan/)
is the best near-current planning topic. The page lists a September 8 public
meeting and discusses growth costs, flooding, traffic, land-use conflicts, and
public services. It is not yet an atomic publishable decision because the check
found no posted draft, commission item, or scheduled vote.

The [Bertrand Drive overlay district](https://www.lafayettela.gov/project-pages/bertrand-dr/)
has a longer public record and a useful changed-event test. Its current next
formal action remains unclear, so it should not replace a council issue as the
production demonstration.

Capture the next Parish Planning Commission packet around September 9 and the
next City Planning Commission packet around September 16. Onboard a body only
after its packet, outcome, revision behavior, and direct links pass the same
gold-set and coverage checks used for the City Council.
