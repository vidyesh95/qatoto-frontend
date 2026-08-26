# Findings: "One Venture, Three Views" — audited against current code

Source: published artifact "One Venture, Three Views" (companion to "The Effort
Ledger"), dated 14 Aug 2026. Checked against `qatoto-frontend` and `qatoto-backend`
at HEAD on 2026-08-25 — 8 factual claims verified, file:line cited throughout.

**Bottom line up front:** the doc's diagnosis is accurate and the 5-step sequencing
(cheapest/highest-leverage first) is sound. The corrections below are about _cost_,
not premise. Two of the five steps are cheaper than the doc implies
(`demandSignalSnapshot` already exists). Two are pricier — the product-page block
needs a backend projection change before any frontend work, and the video/watch move
is four sub-pieces, not a 3-column migration, because the Studio authoring UI that
looks wired today is free text over mock data.

## The doc's core claim

Four seams exist between R&D, Studio and Store today:

1. One real FK, read only by R&D — `product.researchProjectId`.
2. One real, healthy join — `studio.videoAttachedProduct`.
3. One fiction made of retyped text columns — video's milestone/role/member labels.
4. One duplicated pipeline — YouTube ingestion, built twice.

## Per-claim audit

| #   | Claim                                                             | Verdict                             |
| --- | ----------------------------------------------------------------- | ----------------------------------- |
| 1   | `product.researchProjectId` real FK, R&D-only readers             | CONFIRMED                           |
| 2   | Studio's 3 text columns, no FK                                    | CONFIRMED                           |
| 3   | `videoAttachedProduct` real join                                  | CONFIRMED                           |
| 4   | Duplicate YouTube ingestion                                       | CONFIRMED, with nuance              |
| 5   | `studio.video.visibility` has no `"team"`, no `researchProjectId` | CONFIRMED                           |
| 6   | `demandSignalSnapshot` is new                                     | **CHANGED — already exists**        |
| 7   | `projectApplication` flow exists                                  | CONFIRMED, idempotency detail added |
| 8   | Two named consumers are exhaustive                                | CONFIRMED                           |

**1. `store.product.researchProjectId`** — real, nullable, FK `onDelete: restrict`
(`qatoto-backend/src/db/schema/store.ts:2781-2784`). Zero backend serialization of it
anywhere — not in `store-catalog.service.ts`'s product-detail projection, not in any
OpenAPI doc. It doesn't just go unread by the frontend, it never reaches the wire
today. The doc's quoted boundary comment is accurate but has a wording slip in the
source itself ("the studio's own flow" where it means the store's) — worth flagging,
not fixing, since it's not our file.

**2. Studio's 3 text columns** — `videoMilestone.label`, `videoOpenRole.roleTitle`,
`videoTeamMember.memberName` are plain `text`, no FK, comments match the doc verbatim
(`qatoto-backend/src/db/schema/studio.ts:593-640`).

**3. `videoAttachedProduct`** — real join, both FKs, `position` + `pinnedAtSeconds`
(`studio.ts:553-573`).

**4. Duplicate YouTube ingestion** — confirmed at the schema/orchestration level: two
column sets (`rnd.dailyLog` vs `studio.video`), two services (`verify-youtube-video.ts`
async job vs `daily-logs.service.ts` synchronous inline check). But both call the same
shared primitives in `src/lib/youtube.ts` — the duplication is the schema and the
orchestration, not the YouTube-parsing logic itself. A nuance the doc doesn't mention.

**5. `studio.video.visibility`** — enum is `["private","unlisted","public",
"investor_only"]`, no `"team"` value yet, no `researchProjectId` column yet.

**6. `demandSignalSnapshot`** — correction: this table already exists
(`rnd.ts:1847-1911`), fed today by a nightly job off knowledge-hub category/region
data. The doc's step 5 isn't "create it," it's "add store sales/reviews as a second
writer" — smaller than implied, but a different shape of work than the wording
suggests.

**7. `rnd.projectApplication`** — table + full create flow exist
(`project-applications.service.ts`), applicant identity from session, never a body
field. Detail for later: this endpoint takes **no idempotency key** — it's not among
the 4 surfaces `idempotency.ts` names. Retry safety comes from a partial unique index
instead. Not a doc error, just something "apply from watch" work needs to know going
in.

**8. `launch-readiness.service.ts` / `suppliers.service.ts`** — confirmed as the only
two backend readers of `researchProjectId`, and more locked down than the doc implies:
`suppliers.service.ts` explicitly strips the column before returning it (line 576).

## Frontend reality check per move

The doc only read backend schema. Two of its five moves land very differently once
the frontend side is checked.

**Move 2 — "the store reads the venture link back."** Doc calls this "no schema
change, one read + one component." Actually needs, in order: a backend projection
change first (the column exists but isn't serialized, per #1 above), then a new
`researchProjectId` field in `StoreProductDetailSchema`
(`src/lib/store/products.schemas.ts`), then a genuinely new component — there is no
provenance/team/proof-chain block anywhere on today's product-detail page
(`src/components/home/store/product-detail.tsx`) to extend. There is a working
precedent to reuse, though: the reverse link (project → its launched products)
already works via `GET /launch-ready-projects`, powering
`LaunchReadyProjectsRail` — that's a pattern to copy, not something to invent.

**Move 3/4 — video FKs + apply-from-watch.** Bigger gap than the doc's "3 columns"
framing suggests. The public watch payload (`WatchPayloadSchema`,
`src/lib/feed/schemas.ts:277-318`) has **no** milestones/openRoles/teamMembers/
attachedProducts fields at all — they exist only on the owner-only authoring read
(`PublicVideoSchema`, `src/lib/videos/schemas.ts`). The Studio authoring UI that looks
like it already captures this (`video-elements-step.tsx`) is free-text chips over a
**hardcoded mock array** (`MOCK_PITCH_PROJECT_TITLES`), not wired to
`src/lib/rnd/projects.api.ts` at all. There is no "Apply" button or flow anywhere on
the watch page today. So this move is really four sub-pieces: backend adds the fields
to the public watch projection plus the FKs, Studio authoring gets rewired from mock
chips to real entity pickers, the watch page gets new rendering, and apply-from-watch
is a wholly new flow.

Two more things whoever picks this up later will need: `getResearchProjectDetail` is
keyed by **slug**, not id, and `ResearchProjectDetailSchema` has no top-level `id`
field — a product page holding a raw `researchProjectId` (a DB id) can't call it
directly without either a slug lookup or a new by-id route. And the milestones fetcher
(`listProjectMilestones`) is member-scoped and 404s for anonymous viewers, so it can't
be reused as-is for a public-facing block.

## Scope note

No code changed as part of this — audit and write-up only.
