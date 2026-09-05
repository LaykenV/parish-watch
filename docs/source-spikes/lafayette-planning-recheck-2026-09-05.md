# Lafayette planning source recheck

Checked September 5, 2026. Lafayette is not fully supported. City Council and
Youngsville City Council remain supported; the planning bodies still need
meeting evidence and complete coverage certification.

## Recovered document path

The official Planning Commission, Board of Zoning Adjustment, and Hearing
Examiner pages returned HTTP 200. Their site navigation links to
`https://events.lafayettela.gov/`.

An earlier live check found the
[September 11 Hearing Examiner meeting](https://events.lafayettela.gov/default/Detail/2026-09-11-0830-Hearing-Examiner-Public-Meeting).
Its `Agenda - 9-11-26.pdf` attachment returned HTTP 200, `application/pdf`, and
a PDF signature at the event path ending
`/0fc6a5a3-b293-4e7c-a2a8-b4b800f18b9c`.
The September 21 City Zoning meeting page listed an August 17 minutes PDF and a
September 21 agenda DOCX. Those links establish candidate documents, not
accepted evidence or coverage for a different commission.

The old root manifests excluded this official events host. Version 2 permits
only its `/default/Detail/` document path for the three unvalidated Lafayette
entries. The root stays on the checked main government website. Event pages
remain document candidates that require body classification, retrieval, and the
normal publication checks. Version 1 remains resolvable for existing runs and
does not inherit the new permission. Other bodies receive no new host permission.

## Current source failures

A repeated check at 15:59 UTC returned Azure HTTP 502 from the Hearing Examiner
meeting page. The calendar returned a service-unavailable page. These failures
occurred after the successful earlier checks, so the recovered path is not yet
reliable. A reachable government homepage cannot substitute for a working agenda
and outcome link.

The indexed March 12 BOZA agenda and December 8 Parish Planning Commission
agenda still returned HTTP 404 at their former `/docs/default-source/` paths.
Search-engine excerpts are not immutable government evidence. The BOZA page's
agenda link still opens the generic `/parsers/events/` page without a specific
meeting document. The live schedule PDFs establish cadence, not decisions.

A bounded fresh scrape through the development Firecrawl component failed with
provider HTTP 500 after its retrieval engines could not load the event service.
The provider check did not produce a source snapshot or publish a record.

## Required certification work

1. Recover current and historical agenda and outcome documents with stable
   official links. Pin exact files as representative samples only after reading
   them and checking their body, meeting date, and printed case identity.
2. Resolve the existing generic Planning Commission placeholder. The official
   root describes separate City and Parish Planning Commissions. Their records
   must not be combined under one body or certified using City Zoning material.
   The earlier August 29 source spike documents the same identity distinction.
3. Run retrieval, extraction, independent review, immutable revision, missing-item,
   and paired agenda/outcome checks. Then evaluate all ten coverage gates in
   development and production for each exact body.
4. Promote only passing bodies. Parish availability still requires every required
   launch body to pass. Do not weaken that rule because the event service is down.

The versioned permission repair enables future retrieval of the recovered path.
It does not change public support, publish decisions, enable monitoring, or
replace the calendar-only gold samples with unverified documents.
