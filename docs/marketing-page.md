# Public Parish marketing-page brief

Status: historical context pack; Design Slice 2 retired the standalone marketing page

This file is the portable prompt for generating Public Parish landing-page
experiments. It defines the page job, exact copy, durable structure, content
limits, mobile behavior, and transition into the resident application.

The transition is complete. Design Slice 2 kept the headline, lede, Louisiana
relief, and trust language inside the first-visit resident Home. It replaced the
prelaunch repository action with the area selector and moved longer method copy
to the How it works blueprint. Development builds can render the discovery rail
with typed QA fixtures through an explicit URL. Production ignores fixture
parameters, and the resident interface does not put a fixture banner on the
page. Use the resident-interface documents for current work.

## Required first read

Read [`design-system.html`](./design-system.html) before designing or writing
code. It is the source of truth for app-wide color, logo, mobile, touch, motion,
accessibility, and reusable component behavior.

This page brief may narrow that system. It may not weaken or replace it. If the
two files appear to conflict, stop and identify the conflict before building.

Also read the current product sources before making claims:

- [`../PLAN.md`](../PLAN.md)
- [`product-spec.md`](./product-spec.md)
- [`architecture.md`](./architecture.md)
- [`hackathon.md`](./hackathon.md)

Use Anthropic's frontend-design skill for every design experiment. Apply its
subject grounding, deliberate typography, structural variety, motion restraint,
and self-critique. Do not use the skill as permission to change the product
contract or add sections.

## Page job

The primary audience is a Louisiana resident who does not normally follow local
government records.

Before the resident application is ready, the page should:

1. explain the Public Parish promise;
2. show how official evidence becomes a useful resident update;
3. establish trust without implying that unfinished features work;
4. send an interested visitor to the public build.

The primary prelaunch action is `Follow the build`. It links to the public
repository:

`https://github.com/LaykenV/public-parish`

The page is not primarily a hackathon pitch. Civic groups and technical judges
are secondary audiences.

## Durable homepage lifecycle

This page will evolve into the signed-out resident homepage. Do not design a
temporary brochure that must be discarded at Slice 5.

Before launch:

- the hero explains the promise and links to the public build;
- the product-proof slot shows the evidence sequence below;
- the trust and coverage area states the publication standard and planned first
  regions;
- the footer records open-source and hackathon provenance.

When real resident data is public:

- the hero's primary action changes from `Follow the build` to
  `Choose your area`;
- the product-proof slot becomes a horizontal rail of real major decisions;
- `Building first for` changes to `Available in` only for regions that passed
  the common coverage gate;
- longer method and build material moves to `/how-it-works`;
- application navigation appears only when its destinations work.

The layout should make these substitutions possible without a visual rebuild.

## Required structure

Use exactly four durable parts:

1. Hero
2. Product proof
3. Trust and coverage
4. Footer

Do not add a separate problem section, feature grid, statistics band, testimonial
section, sponsor strip, FAQ, pricing, founder story, logo cloud, or generic final
CTA section.

The four parts can use different composition, depth, and rhythm. Do not make
each one a centered heading followed by a row of three cards.

## Hero

Use this exact working copy:

### Heading

> See how local government is changing.

### Supporting copy

> Public Parish connects Louisiana decisions to the official record, public
> deadlines, and what happens next.

### Prelaunch action

`Follow the build`

### Launch action

`Choose your area`

The selected double-P mark lives at
[`../public/brand-mark.svg`](../public/brand-mark.svg). Render the product name as
live text. The resident application shell appears on Home, and its mark and name
link to Home. Do not generate a raster lockup containing the name.

The hero is the page thesis. It should show something specific to Public Parish,
not a generic gradient, abstract orb, device mockup, fake dashboard, or Louisiana
tourism collage.

During prelaunch, render the Louisiana coverage field as an interactive WebGPU
relief. It shares the hero background instead of sitting inside a card. Do not
add a border, title bar, key strip, or shadow around it. Static pins and labels
identify Lafayette, Rapides, and East Baton Rouge. Pointer movement anywhere in
the hero may control a restrained tilt when the device has a fine pointer and
hover. Touch-first devices render one static frame with no ambient loop. On
mobile, keep the headline above the relief and move the supporting copy below
it. Preserve a labeled SVG fallback when WebGPU is unavailable.

## Product proof

Before real issue cards are public, show one animated evidence sequence. It is a
real sequence, so numbering is allowed here.

### Step 1: Find the official record

> Public Parish watches validated local-government sources.

### Step 2: Attach the evidence

> Dates, amounts, deadlines, and outcomes stay tied to exact excerpts.

### Step 3: Make it understandable

> Residents see what may change and ask questions from the same evidence.

### Step 4: Follow what happens

> Material changes and final outcomes return to the issue and its followers.

The sequence should feel like one choreographed explanation, not four generic
feature cards. It can use CSS, SVG, canvas, or a justified motion library. Keep
the underlying text in the document and readable without animation.

Do not fabricate an issue, resident quote, metric, source excerpt, product
screenshot, email, or successful outcome. A real public item may replace the
abstract sequence only after the publication contract accepts it.

Design Slice 2 replaced this section with a rail of fixture decisions used for
deterministic QA. The live discovery path now supplies accepted atomic
publications under the separate "Published decision records" heading. A later
issue projection will supply ranked published issues. On mobile, the
rail uses native horizontal overflow and proximity scroll snapping. Show part
of the next card. Never hijack vertical scrolling or require dragging as the
only input method.

## Trust and coverage

Use this exact working copy:

### Heading

> See the source behind every claim.

### Trust copy

> Public Parish publishes from validated official records. Dates, amounts,
> deadlines, and outcomes link to the exact source. If evidence is missing, the
> page says so.

### Prelaunch coverage copy

> Building first for Lafayette Parish, Rapides Parish, and East Baton Rouge
> Parish. A place appears as supported only after its sources pass the same
> evidence checks.

Do not say Public Parish currently covers these regions until the specific
bodies in that region pass the source, gold-set, freshness, publication, and
direct-link gates.

This section should eventually accept live coverage states such as supported,
degraded, validating, paused, and not supported. Do not use a public `beta`
label to excuse weaker evidence.

## Footer

Use this provenance line:

> Free, open source, and built for the Convex All Gas Hackathon.

The footer may link to:

- the public GitHub repository;
- the public build log;
- method and neutrality information;
- coverage and source health when those routes exist.

Do not create a separate hackathon or sponsor section. Sponsor names may appear
in the build log or a restrained technical note after their integrations work.
Resident value stays first.

## Brand direction

Follow [`design-system.html`](./design-system.html) for exact tokens and usage.
The intended character is warm civic utility with an editorial edge. It should
feel calm, direct, inspectable, and recognizably Louisiana without resembling a
campaign, government portal, university athletics site, Mardi Gras event poster,
or tourism brand.

The palette has unequal roles:

- deep purple carries identity and primary action;
- brass gold carries limited emphasis and motion;
- cypress green carries evidence and source-health meaning;
- warm paper and near-black plum carry the reading experience.

Do not turn purple, gold, and green into three equal panels or repeating stripes.

## Experiment freedom

Every experiment must preserve:

- all exact copy in this file;
- the four-part page structure;
- the palette and logo rules in `design-system.html`;
- the prelaunch-to-launch substitutions;
- mobile, touch, motion, accessibility, and evidence rules;
- factual implementation status;
- the forbidden-pattern list.

Each experiment may choose:

- typography and font pairing;
- section composition and container behavior;
- spacing character and responsive scale within the shared spacing system;
- the component library or plain CSS;
- how the one evidence sequence is staged;
- one memorable visual signature grounded in civic evidence or Louisiana
  material culture;
- restrained illustration or texture that does not invent civic facts.

Typography must use fonts the open-source project can legally ship. Avoid
italicized contrast text. Name the display, body, and data roles in the handoff.

Do not install or commit a component or motion library merely to generate an
experiment. If a library materially improves a prototype, identify it and its
cost in the handoff so the owner can decide whether to adopt it.

## Motion contract

The page has two coordinated motion moments:

1. a restrained hero entrance or ambient response;
2. the evidence-sequence animation.

Small hover, focus, active, and rail feedback does not count as a third major
moment.

Animate transform and opacity. Do not animate layout properties. Do not add
bounce, overshoot, endless ambient loops, scroll-jacking, delayed focus rings,
or motion that blocks reading.

Reduced-motion mode must show the final hero and evidence states immediately or
through a short opacity change. The page remains complete when JavaScript or
animation fails.

## Mobile and touch acceptance

Treat the phone as the primary design case. Verify every experiment at 320, 375,
414, and 768 CSS pixels before desktop handoff.

Required:

- no page-level horizontal overflow;
- no clipped hero copy;
- 44 by 44 CSS pixel minimum touch targets;
- primary actions stay on one line;
- no essential hover-only behavior;
- visible keyboard focus and logical tab order;
- display headings wrap inside long words;
- section heads collapse to one column;
- image-bearing grids use `minmax(0, 1fr)`;
- horizontal rails use native scrolling and remain discoverable;
- no nested scrolling trap;
- no drag-only control;
- reduced motion remains usable.

If the final app renders a finite peer collection such as decisions, use a
horizontal rail on mobile instead of a long stack. Do not turn prose, trust
content, or every section into a carousel.

## Patterns to reject

Do not use:

- decorative eyebrow labels;
- pill-shaped navigation or generic pill metadata;
- italicized words added only for contrast;
- a generic hero, three-feature grid, CTA, and footer template;
- gradient blobs, AI sparkles, fake browser chrome, or fake phone frames;
- a dashboard screenshot for a resident product that has no finished UI;
- political red-versus-blue framing;
- a seal, ballot box, capitol dome, map pin, Louisiana outline, pelican, or
  literal fleur-de-lis as default civic symbolism;
- numbered section labels outside the real evidence sequence;
- invented metrics, testimonials, partners, user counts, coverage claims, or
  outcomes;
- language that tells a resident what political conclusion to reach;
- backend jargon in headings or primary copy.

Do not mention visual reference sites inside the generated page or its public
source. The brief records the transferable rules, not the reference names.

## Current truth boundary

Before generating public copy, re-check [`hackathon.md`](./hackathon.md) and the
repository. At the time this brief was last updated:

- the public production app has accepted decisions, issues, exact evidence,
  and bounded anonymous Ask;
- Google accounts and verified email subscribers can create and manage follows;
- AgentMail immediate alerts, weekly roundups, delivery state, and notification
  settings shipped in Slice 7C;
- grounded inbound email replies and private source reports shipped in Slice
  7D;
- coverage claims remain limited to bodies that pass the publication and
  coverage gates in [`sources.md`](./sources.md);
- the owner-run coverage compiler remains future work.

Do not turn planned features into present-tense product claims.

## Experiment handoff

Each design agent should return:

1. one standalone implementation or clearly bounded branch;
2. the chosen typography and license source;
3. the single visual signature and why it belongs to Public Parish;
4. any new dependency and why plain CSS or existing tools were insufficient;
5. screenshots at 320, 375, 414, 768, and a desktop width;
6. reduced-motion verification;
7. keyboard and focus verification;
8. a list of any choices that should graduate into
   [`design-system.html`](./design-system.html).

Do not update the shared design system during an experiment. The owner will
select what graduates after comparing the alternatives.
