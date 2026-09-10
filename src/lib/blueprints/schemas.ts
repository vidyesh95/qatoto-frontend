// TRANSPORT: props-only — pure contract, no network of its own.
//
// Client-side contract for the Blueprints hub: engineering teardowns, working prototypes and
// commercialization case studies. NOTHING BEHIND IT IS REAL YET — `@/lib/blueprints/api` serves
// fixtures from `@/mocks/blueprints-mocks` — but the shapes below are written as if the payload
// arrived over the wire, because one day it will and the swap should touch one file.
//
// Every object ends `.strip()` so a backend minor release that adds a field is a no-op here
// rather than a parse failure (CLAUDE.md Pattern 2). Note the house-documented failure mode of
// `.strip()` before relying on it for a WRITE path: `src/lib/products/schemas.ts:98-107` records
// how a stripped field silently destroyed sellers' declared lead times on every edit. These are
// read shapes only, so that trap does not apply.

import { z } from "zod";

import {
  createExternalHttpsUrlSchema,
  createHttpsOrSiteRelativeUrlSchema,
} from "@/lib/blueprints/url-source.schemas";
import { extractYoutubeVideoId } from "@/lib/youtube";
import type { CursorPage } from "@/lib/store/shared.schemas";

// --- Enum tuples -------------------------------------------------------------
//
// SNAKE_CASE, NOT KEBAB, and this is not a style preference. Enum values are data that must
// byte-match a Postgres `pgEnum` label in both directions — `z.enum(["case_study"])` rejects
// `"case-study"`, and `?category=case-study` would be a 422 from a `.strict()` query schema
// rather than an ignored value. Kebab-case governs FILE NAMES, DIRECTORIES, PATH SEGMENTS and
// SLUGS; `/blueprints/solar-cold-storage-teardown` is kebab and `category=case_study` is snake,
// and both are correct at the same time. See CLAUDE.md, "Naming — wire casing".

/**
 * The 70/20/10 content split the hub is organised around.
 *
 * - `teardown` (70%) — PCB schematics, CAD breakdowns, BOM costs, tolerances, reverse engineering.
 * - `showcase` (20%) — working proof-of-concept demos and finished builds from those blueprints.
 * - `case_study` (10%) — go-to-market metrics, manufacturing volume stories, unit economics.
 */
export const BLUEPRINT_CATEGORIES = ["teardown", "showcase", "case_study"] as const;
export const BlueprintCategorySchema = z.enum(BLUEPRINT_CATEGORIES);
export type BlueprintCategory = z.infer<typeof BlueprintCategorySchema>;

export const BLUEPRINT_CATEGORY_LABELS: Record<BlueprintCategory, string> = {
  teardown: "Teardown",
  showcase: "Showcase",
  case_study: "Case study",
};

/**
 * The HUB LANE HEADING for each arm — plural, because a lane holds several.
 *
 * SEPARATE FROM `BLUEPRINT_CATEGORY_LABELS`, WHICH IS SINGULAR AND STAYS SINGULAR. That record
 * names ONE blueprint: the navbar breadcrumb over a detail page (`navbar.tsx:75`) and the category
 * pill on a card (`blueprint-card-body.tsx:56`). "Teardowns" is wrong in both. Two records rather
 * than one plus a pluralising helper, because "Case study" pluralises to "Case studies" and
 * "Showcase" does not pluralise at all — the lane is called Showcase whatever is in it.
 *
 * WRITTEN OUT, NOT DERIVED FROM `BLUEPRINT_CATEGORY_SEGMENTS`, for the reason the reverse segment
 * map beneath it is written out: a URL token is not display text, and un-kebabbing one into a
 * heading is the same wrong move in the other direction.
 */
export const BLUEPRINT_CATEGORY_LANE_HEADINGS: Record<BlueprintCategory, string> = {
  teardown: "Teardowns",
  showcase: "Showcase",
  case_study: "Case studies",
};

/**
 * THE QUESTION EACH ARM ANSWERS, which is the one line under its lane heading.
 *
 * ⚠️ IT REPLACED `BLUEPRINT_CATEGORY_BLURBS`, AND THE CHANGE IS THE POINT RATHER THAN THE COPY. The
 * blurbs described what each arm contained — "schematics, CAD breakdowns and bills of materials" —
 * which is what a rail heading says when three rails look identical and the words are the only
 * thing distinguishing them. The hub no longer renders three identical rails, so the words stop
 * doing that job and start doing this one: a reader arrives with a question, and the lane that
 * answers it should say so.
 *
 * A QUESTION MARK IS NOT AN EXCLAMATION MARK. PRODUCT.md bans urgency theatre, not punctuation, and
 * these are literally interrogative.
 */
export const BLUEPRINT_CATEGORY_QUESTIONS: Record<BlueprintCategory, string> = {
  teardown: "Can I make this, and what will it cost?",
  showcase: "What did people just launch?",
  case_study: "What did somebody learn the expensive way?",
};

/**
 * The PATH SEGMENT each category lives under. Kebab, and two of the three are PLURAL while the
 * enum label is singular — which is why the reverse map below is written out rather than derived
 * with `replaceAll("-", "_")`. String munging is wrong for two of these three.
 *
 * Extends the casing note above: `case_study` is the wire value and `case-studies` is the URL,
 * and both are correct at the same time.
 */
export const BLUEPRINT_CATEGORY_SEGMENTS: Record<BlueprintCategory, string> = {
  teardown: "teardowns",
  showcase: "showcase",
  case_study: "case-studies",
};

/** The segments a blueprint slug may NOT take, because a static route already owns them. */
export const RESERVED_BLUEPRINT_SLUGS: readonly string[] = Object.values(
  BLUEPRINT_CATEGORY_SEGMENTS,
);

export const BLUEPRINT_CATEGORY_BY_SEGMENT: Record<string, BlueprintCategory> = {
  teardowns: "teardown",
  showcase: "showcase",
  "case-studies": "case_study",
};

/**
 * THE ONLY PLACE A BLUEPRINT URL IS BUILT.
 *
 * Every card, rail and back-link goes through this. The flat `/blueprints/<slug>` shape these
 * URLs used to have still resolves — `[slug]/page.tsx` permanently redirects it — but nothing
 * should mint one, and a single function is what makes that checkable with a grep.
 */
export function buildBlueprintHref(blueprint: {
  readonly category: BlueprintCategory;
  readonly slug: string;
}): string {
  return `/blueprints/${BLUEPRINT_CATEGORY_SEGMENTS[blueprint.category]}/${blueprint.slug}`;
}

/** The list route for one category. */
export function buildBlueprintCategoryHref(category: BlueprintCategory): string {
  return `/blueprints/${BLUEPRINT_CATEGORY_SEGMENTS[category]}`;
}

/**
 * The axis case studies are colour-coded on — the local equivalent of the Heuristic / Principle /
 * Gestalt split a reference index like lawsofux.com tints its cards by. A manufacturing lesson is
 * about ONE of these, and which one is the first thing a reader scanning the index wants.
 */
export const BLUEPRINT_DISCIPLINES = [
  "tooling",
  "supply_chain",
  "quality",
  "distribution",
  "unit_economics",
] as const;
export const BlueprintDisciplineSchema = z.enum(BLUEPRINT_DISCIPLINES);
export type BlueprintDiscipline = z.infer<typeof BlueprintDisciplineSchema>;

export const BLUEPRINT_DISCIPLINE_LABELS: Record<BlueprintDiscipline, string> = {
  tooling: "Tooling",
  supply_chain: "Supply chain",
  quality: "Quality",
  distribution: "Distribution",
  unit_economics: "Unit economics",
};

/** What kind of file a teardown published. */
export const BLUEPRINT_DOCUMENT_KINDS = [
  "schematic",
  "bill_of_materials",
  "assembly_guide",
  "datasheet",
] as const;
export const BlueprintDocumentKindSchema = z.enum(BLUEPRINT_DOCUMENT_KINDS);
export type BlueprintDocumentKind = z.infer<typeof BlueprintDocumentKindSchema>;

export const BLUEPRINT_DOCUMENT_KIND_LABELS: Record<BlueprintDocumentKind, string> = {
  schematic: "Schematic",
  bill_of_materials: "Bill of materials",
  assembly_guide: "Assembly guide",
  datasheet: "Datasheet",
};

/**
 * How a part was made. The exploded view's part panel prints this; nothing filters by it.
 * Snake_case for the reason the file header gives — these byte-match a future `pgEnum`.
 */
export const TEARDOWN_MANUFACTURING_METHODS = [
  "cnc_milled",
  "injection_molded",
  "sheet_metal",
  "fdm_printed",
  "pcb_assembly",
  "cast",
  "off_the_shelf",
] as const;
export const TeardownManufacturingMethodSchema = z.enum(TEARDOWN_MANUFACTURING_METHODS);
export type TeardownManufacturingMethod = z.infer<typeof TeardownManufacturingMethodSchema>;

export const TEARDOWN_MANUFACTURING_METHOD_LABELS: Record<TeardownManufacturingMethod, string> = {
  cnc_milled: "CNC milled",
  injection_molded: "Injection moulded",
  sheet_metal: "Sheet metal",
  fdm_printed: "FDM printed",
  pcb_assembly: "PCB assembly",
  cast: "Cast",
  off_the_shelf: "Off the shelf",
};

/**
 * What turns a fastener — or, for the last three, why there is nothing to turn. An adhesive strip
 * and a moulded snap hold parts together and come apart in a disassembly step, so they are
 * fasteners for the purpose of a repairability score even though no tool fits them.
 */
export const TEARDOWN_FASTENER_DRIVES = [
  "torx",
  "hex_socket",
  "phillips",
  "slotted",
  "adhesive",
  "snap_fit",
  "press_fit",
] as const;
export const TeardownFastenerDriveSchema = z.enum(TEARDOWN_FASTENER_DRIVES);
export type TeardownFastenerDrive = z.infer<typeof TeardownFastenerDriveSchema>;

export const TEARDOWN_FASTENER_DRIVE_LABELS: Record<TeardownFastenerDrive, string> = {
  torx: "Torx",
  hex_socket: "Hex socket",
  phillips: "Phillips",
  slotted: "Slotted",
  adhesive: "Adhesive",
  snap_fit: "Snap fit",
  press_fit: "Press fit",
};

/**
 * What kind of file a machine shop or a fab house takes. NOT A `BlueprintDocumentKind` — see
 * `TeardownManufacturingFileSchema` for why the two lists never merge. There is no
 * `schematic_pdf` here on purpose: a schematic PDF is a `documents[]` row with
 * `kind: "schematic"`, and an enum value no fixture exercises is unverified code on this surface.
 */
export const TEARDOWN_MANUFACTURING_FILE_KINDS = [
  "step",
  "stl",
  "dxf",
  "gerber",
  "drill",
  "pick_and_place",
  "bill_of_materials_csv",
] as const;
export const TeardownManufacturingFileKindSchema = z.enum(TEARDOWN_MANUFACTURING_FILE_KINDS);
export type TeardownManufacturingFileKind = z.infer<typeof TeardownManufacturingFileKindSchema>;

export const TEARDOWN_MANUFACTURING_FILE_KIND_LABELS: Record<
  TeardownManufacturingFileKind,
  string
> = {
  step: "STEP",
  stl: "STL",
  dxf: "DXF",
  gerber: "Gerber",
  drill: "Drill",
  pick_and_place: "Pick and place",
  bill_of_materials_csv: "Bill of materials (CSV)",
};

/**
 * The same seven formats, short enough for a card.
 *
 * TWO RECORDS, ON THE `FACTORY_CAPABILITY_SHORT_LABELS` PRECEDENT
 * (`src/lib/store/factories.schemas.ts`). The long labels above head a download bundle on the
 * detail page, where "Bill of materials (CSV)" is exactly right; the index card lists up to four of
 * them on ONE 12px line, where the same string wraps the card and pushes the grid row taller than
 * its neighbours. Measured: the four electronics kinds ran to 56 characters and wrapped.
 *
 * ⚠️ ONLY `bill_of_materials_csv` ACTUALLY SHORTENS. The other six are already as short as they get
 * without becoming initialisms nobody reads — "P&P" for pick and place saves eleven characters and
 * costs a reader who has not seen it before, which is a bad trade on the surface whose whole job is
 * telling a non-expert what it would take to build something.
 */
export const TEARDOWN_MANUFACTURING_FILE_KIND_SHORT_LABELS: Record<
  TeardownManufacturingFileKind,
  string
> = {
  step: "STEP",
  stl: "STL",
  dxf: "DXF",
  gerber: "Gerber",
  drill: "Drill",
  pick_and_place: "Pick and place",
  bill_of_materials_csv: "BOM CSV",
};

/** The two download bundles a teardown's files are grouped under. */
export const TEARDOWN_MANUFACTURING_BUNDLES = ["mechanical", "electronics"] as const;
export type TeardownManufacturingBundle = (typeof TEARDOWN_MANUFACTURING_BUNDLES)[number];

export const TEARDOWN_MANUFACTURING_BUNDLE_LABELS: Record<TeardownManufacturingBundle, string> = {
  mechanical: "Mechanical",
  electronics: "Electronics",
};

/**
 * Which bundle each kind belongs to. A `Record` over the kind enum so an added kind is a compile
 * error HERE rather than a file that renders under neither heading.
 */
export const TEARDOWN_MANUFACTURING_FILE_BUNDLES: Record<
  TeardownManufacturingFileKind,
  TeardownManufacturingBundle
> = {
  step: "mechanical",
  stl: "mechanical",
  dxf: "mechanical",
  gerber: "electronics",
  drill: "electronics",
  pick_and_place: "electronics",
  bill_of_materials_csv: "electronics",
};

/** How much prior hardware experience a build assumes. */
export const BLUEPRINT_DIFFICULTIES = ["beginner", "intermediate", "advanced"] as const;
export const BlueprintDifficultySchema = z.enum(BLUEPRINT_DIFFICULTIES);
export type BlueprintDifficulty = z.infer<typeof BlueprintDifficultySchema>;

export const BLUEPRINT_DIFFICULTY_LABELS: Record<BlueprintDifficulty, string> = {
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",
};

/**
 * How the launch feed is ordered — `?sort=` on `/blueprints/showcase`.
 *
 * `newest` is `launchedAt` descending and the default (no `?sort=` in the URL); `top` is
 * `upvoteCount` descending and is an ORDER, not a rank — nothing renders a numeral. Single words,
 * so snake_case and kebab-case agree. The comparators live in `api.ts` beside the filter, because a
 * cursor into an order the page could re-derive differently is meaningless.
 */
export const SHOWCASE_SORTS = ["newest", "top"] as const;
export type ShowcaseSort = (typeof SHOWCASE_SORTS)[number];
export const DEFAULT_SHOWCASE_SORT: ShowcaseSort = "newest";

export const SHOWCASE_SORT_LABELS: Record<ShowcaseSort, string> = {
  newest: "Newest",
  top: "Top",
};

/**
 * What a teardown published — `?media=` on `/blueprints/teardowns`. Its own filter, because "has
 * a 3D model" is not a tag. Single words, so snake_case and kebab-case agree. The predicates live
 * in `api.ts` beside the paging, for the reason the sort comparators do.
 */
export const TEARDOWN_MEDIA_FILTERS = ["assembly", "video", "documents"] as const;
export type TeardownMediaFilter = (typeof TEARDOWN_MEDIA_FILTERS)[number];

export const TEARDOWN_MEDIA_FILTER_LABELS: Record<TeardownMediaFilter, string> = {
  assembly: "Has 3D model",
  video: "Has walkthrough",
  documents: "Has files",
};

// --- Object shapes -----------------------------------------------------------

/**
 * The indicative bill-of-materials cost band, in integer cents.
 *
 * A RANGE AND NOT A FIGURE, on purpose — the same argument `CofounderCapitalRangeSchema`
 * (`src/lib/store/cofounders.schemas.ts:141`) makes about capital: nobody writes one number here
 * honestly, and a single number reads as a quote rather than an estimate.
 *
 * BOTH ENDS ARE REQUIRED TOGETHER, so the whole object is nullable rather than its fields. Half a
 * range is not "a floor with no ceiling", it is an unanswerable question.
 *
 * `null` MEANS NOBODY COSTED IT. It is not zero, and a renderer must show an absence — see
 * `formatCentsRangeLabel`, which returns `null` rather than inventing a band.
 *
 * INTEGER CENTS, NEVER A DISPLAY STRING. A stored `"$45 - $60"` cannot be filtered, sorted,
 * converted or localised, and it fixes the currency at author time. Formatting is the view
 * layer's job and belongs to `formatCentsRangeLabel`, not the contract.
 */
export const BlueprintCostRangeSchema = z
  .object({
    minimumInCents: z.number().int().nonnegative(),
    maximumInCents: z.number().int().nonnegative(),
    /** ISO 4217, e.g. "USD". Spelled `currency` to match every other money shape in `src/lib`. */
    currency: z.string(),
  })
  .strip();
export type BlueprintCostRange = z.infer<typeof BlueprintCostRangeSchema>;

export const BlueprintAuthorSchema = z
  .object({
    displayName: z.string(),
    /** The channel handle, without a leading "@" — the "@" is added at render time. */
    handle: z.string(),
    avatarUrl: z.string(),
  })
  .strip();
export type BlueprintAuthor = z.infer<typeof BlueprintAuthorSchema>;

// --- Media and link value objects --------------------------------------------

/**
 * A video attached to a build — a teardown walkthrough or a showcase demo.
 *
 * ⚠️ IT IS A YOUTUBE ID, AND THERE IS NO OTHER KIND. `video-card-menu.tsx` states the platform rule
 * this follows: "Every video on the platform today is a YouTube link. The bytes sit on youtube.com,
 * Qatoto never holds them and has no right to serve them." Self-hosted video is
 * `STUDIO_BACKEND_STRUCTURE.md` Appendix A — "Deferred: self-hosted video (Livepeer direct upload)",
 * headed "⛔ DO NOT BUILD THIS NOW" — and the studio enforces it today by rendering its file
 * dropzone `inert` with the copy "Direct video hosting isn't available yet".
 *
 * This shape briefly carried a second `hosted` arm with a served `url` and a WebVTT `captionsUrl`.
 * It was removed because nothing could ever fill it: `POST /videos` takes a `youtubeUrl` and there
 * is no file-upload route on the platform. A blueprint author pastes a link, exactly as a studio
 * author does.
 *
 * WHY A ONE-ARM UNION RATHER THAN A BARE OBJECT. `source` still discriminates nothing, and that is
 * the point — it is the seam Appendix A would widen, kept for the same reason `feed/schemas.ts`
 * keeps both labels of the `video_source` pgEnum ("Every row is `youtube` today; `hosted` is Studio
 * Appendix A") and the same reason `TeardownSimulationTelemetrySchema.source` is a `z.literal`.
 * The label byte-matches that pgEnum, so a real backend needs no translation layer.
 */
const BlueprintVideoSharedShape = {
  /**
   * The still shown before playback starts. Required — a play button over nothing is a bug — and
   * free to produce: `https://i.ytimg.com/vi/<id>/hqdefault.jpg` is derivable from the id with no
   * network call at all, which is what `thumbnail-picker.tsx` already does for the studio.
   * `hqdefault` rather than `maxresdefault`, which 404s on anything not uploaded in HD.
   */
  posterUrl: createHttpsOrSiteRelativeUrlSchema(2048),
  /**
   * `durationSeconds` IS AN INTEGER, NOT `"8:12"`. Same argument the cost range makes above about
   * display strings: a stored label cannot be summed, sorted or localised, and it fixes the
   * formatting at author time. `formatDurationLabel` (`src/lib/feed/format.ts`) turns it into the
   * poster badge, and returns `null` rather than "0:00" when there is nothing to show.
   *
   * ⚠️ NULLABLE, BECAUSE NOTHING ON EITHER SIDE OF THE WIRE CAN MEASURE IT. The backend's only
   * outbound YouTube call is oEmbed, which returns a title and a thumbnail and NO duration — which
   * is why `video.duration_seconds` over there is nullable and, in its own words, "NULL on every
   * YouTube row". The frontend makes no YouTube call at all. Requiring it here would force an
   * authoring form to ask an author to type a runtime, and a typed runtime is a guess: the badge
   * would read "8:12" over a video of some other length, which is the lie the fixture header
   * forbids. `null` means nobody measured it and the badge renders nothing.
   *
   * A real value is still a measurement: read off the live IFrame player, or from YouTube at write
   * time if the Data API is ever wired.
   */
  durationSeconds: z.number().int().positive().nullable(),
};

/**
 * AN ID ON THE WIRE, NOT A URL, and the difference is where a bad link fails. `extractYoutubeVideoId`
 * (`src/lib/youtube.ts`) is strict about the eleven-character form and the hostnames it accepts;
 * running it at the boundary makes a malformed link a PARSE failure with a path, while storing the
 * URL would push it into render, where the same bad link is a blank box. It is the same function
 * `create-studio-page.tsx` validates a pasted link with, and the authoring form that eventually
 * writes this field is where it belongs.
 *
 * NO CAPTIONS FIELD AND NO CHAPTERS FIELD. A WebVTT track can only attach to a `<video>` element,
 * and YouTube serves its own captions and its own chapters. `todo.md` records the same boundary for
 * `/studio/subtitles` — "IT IS IMPOSSIBLE ON THIS ARCHITECTURE … Qatoto cannot inject captions into
 * a YouTube embed" — and it is why an assembly step carries no timestamp either.
 */
export const YoutubeBlueprintVideoSchema = z
  .object({
    ...BlueprintVideoSharedShape,
    source: z.literal("youtube"),
    youtubeVideoId: z.string().refine(
      // ONE OWNER FOR THE PATTERN. `extractYoutubeVideoId` accepts a bare id and echoes it, so
      // this reuses its validation instead of keeping a second copy of the regex that could
      // drift from it. It also rejects a full watch URL, which is correct: the field is an id.
      (candidate) => extractYoutubeVideoId(candidate) === candidate,
      "A YouTube video id is eleven URL-safe characters — pass the id, not a watch link.",
    ),
  })
  .strip();
export type YoutubeBlueprintVideo = z.infer<typeof YoutubeBlueprintVideoSchema>;

export const BlueprintVideoSchema = z.discriminatedUnion("source", [YoutubeBlueprintVideoSchema]);
export type BlueprintVideo = z.infer<typeof BlueprintVideoSchema>;

/**
 * One published file on a teardown: the schematic, the BOM, the assembly guide.
 *
 * `byteSize` is INTEGER BYTES for the same reason the duration is seconds. `formatFileSizeFromBytes`
 * (`src/lib/rnd/format.ts`) renders it.
 */
export const BlueprintDocumentSchema = z
  .object({
    id: z.string(),
    kind: BlueprintDocumentKindSchema,
    title: z.string(),
    url: createHttpsOrSiteRelativeUrlSchema(2048),
    byteSize: z.number().int().nonnegative(),
    /** `null` when the backend never counted the pages. Not zero — a zero-page PDF is not a file. */
    pageCount: z.number().int().positive().nullable(),
  })
  .strip();
export type BlueprintDocument = z.infer<typeof BlueprintDocumentSchema>;

/** A labelled link that may leave the site. */
export const BlueprintLinkSchema = z
  .object({
    label: z.string(),
    url: createExternalHttpsUrlSchema(2048),
  })
  .strip();
export type BlueprintLink = z.infer<typeof BlueprintLinkSchema>;

/** One person on a showcase build. Shaped like `BlueprintAuthor` plus what they did. */
export const BlueprintTeamMemberSchema = z
  .object({
    displayName: z.string(),
    handle: z.string(),
    avatarUrl: createHttpsOrSiteRelativeUrlSchema(2048),
    /** Free text, e.g. "Firmware". Not an enum — a two-person build invents its own titles. */
    role: z.string(),
  })
  .strip();
export type BlueprintTeamMember = z.infer<typeof BlueprintTeamMemberSchema>;

/**
 * An amount of money, in integer minor units.
 *
 * FACTORED OUT OF `BlueprintMetricValueSchema`'s money arm rather than written twice. Both spell
 * the pair `amountInCents` + `currency`, and two independent copies of a money shape drift into
 * two spellings of one concept — the failure the wire-casing rule exists to prevent.
 *
 * INTEGER MINOR UNITS, NEVER A DISPLAY STRING, for the reason `BlueprintCostRangeSchema` states at
 * length. "₹1 Cr" is 1_000_000_000 paise — a crore is 10^7 rupees at 100 paise each — and stored as
 * text it cannot be sorted, converted or localised, and it fixes the currency at author time.
 */
const BlueprintMoneyShape = {
  amountInCents: z.number().int(),
  /** ISO 4217, e.g. "USD". Spelled `currency` to match every other money shape in `src/lib`. */
  currency: z.string(),
};

export const BlueprintMoneySchema = z.object({ ...BlueprintMoneyShape }).strip();
export type BlueprintMoney = z.infer<typeof BlueprintMoneySchema>;

/**
 * A number a case study reports, carrying WHAT KIND OF NUMBER IT IS.
 *
 * "3,400 units", "$4.12 landed cost" and "18% scrap" are three different things and only one of
 * them is money. A single `value: string` would have flattened all three into text that cannot be
 * converted, compared or localised — and would have fixed the currency at author time, which is
 * exactly the failure `billOfMaterialsCostRange` is written in cents to avoid.
 *
 * Percentages are BASIS POINTS so a fraction survives the integer: 1825 is 18.25%.
 */
export const BlueprintMetricValueSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("count"), amount: z.number().int() }).strip(),
  z.object({ kind: z.literal("money"), ...BlueprintMoneyShape }).strip(),
  z.object({ kind: z.literal("percentage"), basisPoints: z.number().int() }).strip(),
]);
export type BlueprintMetricValue = z.infer<typeof BlueprintMetricValueSchema>;

export const BlueprintOutcomeMetricSchema = z
  .object({
    label: z.string(),
    value: BlueprintMetricValueSchema,
  })
  .strip();
export type BlueprintOutcomeMetric = z.infer<typeof BlueprintOutcomeMetricSchema>;

/**
 * A company a case study is drawn from.
 *
 * ⚠️ EVERY NAME IN THE FIXTURES IS INVENTED, AND MUST STAY INVENTED. A fabricated record attached
 * to a real company's name is a different thing from a fabricated teardown: the surface's
 * de-indexing covers the second and not the first. When real case studies land, a name here is a
 * claim somebody made about a business and the backend owns whether it may be published.
 *
 * `locationLabel` and `yearLabel` are FREE TEXT and not a place id or a date. "Chennai, 2023" is
 * what a founder writing this down actually knows; parsing it into a typed region would invent a
 * precision the source does not have.
 */
export const CaseStudyEvidenceCompanySchema = z
  .object({
    name: z.string(),
    locationLabel: z.string(),
    yearLabel: z.string(),
  })
  .strip();
export type CaseStudyEvidenceCompany = z.infer<typeof CaseStudyEvidenceCompanySchema>;

/**
 * Where a figure in a case study came from.
 *
 * `BlueprintLinkSchema` PLUS A PUBLISHER, which is the whole reason this is not just that schema.
 * PRODUCT.md: "Name the source of a number. An unattributed figure reads as invented on this
 * product, because on comparable products it usually is." A bare labelled URL names a destination,
 * not a publisher, and "read more" over a link is exactly the unattributed shape that rule bans.
 */
export const BlueprintSourceSchema = z
  .object({
    label: z.string(),
    publisherLabel: z.string(),
    url: createExternalHttpsUrlSchema(2048),
  })
  .strip();
export type BlueprintSource = z.infer<typeof BlueprintSourceSchema>;

// --- Teardown assembly value objects -----------------------------------------
//
// EVERY LENGTH IS MILLIMETRES AND EVERY FILE SIZE IS BYTES, integers where a fraction would be
// noise. The `.glb` itself is in METRES, because glTF §3.6.1 says so; the engine multiplies by
// 0.001 at the boundary and nothing else in this repo ever sees a metre. Drawings are read in mm,
// so the contract is written in mm. A file exported in the wrong unit is a known limitation, not a
// field — a calibration knob for spec-violating exports would be a second unit nobody asked for.

/** A vector or a position: three numbers, in whatever unit the field name says. */
const NumberTripleSchema = z.tuple([z.number(), z.number(), z.number()]);
export type NumberTriple = z.infer<typeof NumberTripleSchema>;

/**
 * One `.glb` the exploded view downloads. `url` is on the wire for the reason
 * `ProductThreeDimensionalModelSchema` (`src/lib/store/products.schemas.ts:212`) puts it there:
 * the model is fetched directly by the page, not taken away through a download gate.
 *
 * `byteSize` IS POSITIVE, not non-negative like a document's: a zero-byte model is an upload that
 * failed, and the contract should refuse it rather than mount a viewport over nothing.
 */
export const TeardownModelFileSchema = z
  .object({
    url: createHttpsOrSiteRelativeUrlSchema(2048),
    byteSize: z.number().int().positive(),
  })
  .strip();
export type TeardownModelFile = z.infer<typeof TeardownModelFileSchema>;

/**
 * What every part carries, whichever way its geometry arrives.
 *
 * `explosionDirection` AND `explosionDistanceMm` ARE INDEPENDENTLY NULLABLE — an exception to
 * the house rule that co-required fields share one nullable object. They are not co-required: an
 * author may pin the direction and let the engine pick a distance from the bounds, or the reverse.
 * `null` on either means "the engine decides". The direction NEED NOT BE UNIT LENGTH (the engine
 * normalises) but it may not be zero, because zero has no direction to normalise.
 *
 * `stressRating` IS AN AUTHOR-ASSIGNED HEAT-MAP WEIGHT IN [0, 1], NOT A SOLVER RESULT. It tints a
 * part; it claims nothing about a load case. The solver figures live in
 * `TeardownSimulationTelemetrySchema`, attributed, and the two must never be conflated.
 */
const TeardownPartBaseShape = {
  id: z.string(),
  /** What a person reads on the callout pin and in the part panel. */
  label: z.string(),
  /** The part this one explodes away from. `null` for a top-level part. Must name a sibling. */
  parentPartId: z.string().nullable(),
  /** Free text, e.g. "6063-T5 aluminium, black anodised". */
  material: z.string(),
  manufacturingMethod: TeardownManufacturingMethodSchema,
  explosionDirection: NumberTripleSchema.refine(
    (direction) => direction.some((component) => component !== 0),
    "An explosion direction cannot be the zero vector.",
  ).nullable(),
  explosionDistanceMm: z.number().positive().nullable(),
  /**
   * Which plane this part lands on in a LAYERED explosion — see `explosionAxis` on the assembly.
   * Duplicates are legal and useful (three buttons share one plane) and so are gaps. `null` only
   * when the assembly explodes radially; the arm refinements enforce that all-or-nothing.
   */
  layerIndex: z.number().int().nonnegative().nullable(),
  stressRating: z.number().min(0).max(1).nullable(),
  /** One sentence beside the label in the viewport. `null` when the label says it all. */
  calloutText: z.string().nullable(),
};

/**
 * A part addressed by name INSIDE one composite `.glb` — what a CAD export of a whole assembly
 * produces. `nodeName` IS BYTE-MATCHED against `nodes[].name` in the file; `label` is what a
 * person reads. Two fields because an exporter writes `enclosure_lid` and a caption says
 * "Enclosure lid", and deriving one from the other in either direction is a guess.
 */
export const CompositeTeardownPartSchema = z
  .object({
    ...TeardownPartBaseShape,
    nodeName: z.string().min(1),
  })
  .strip();
export type CompositeTeardownPart = z.infer<typeof CompositeTeardownPartSchema>;

/**
 * Where a per-part file sits in the assembly, when the file does not already say.
 *
 * `null` MEANS "THE FILE WAS EXPORTED IN ASSEMBLY COORDINATES — TRUST IT", which is what a
 * part-by-part export from one CAD assembly gives. A non-null placement is for the common
 * hobbyist export where every part sits at its own origin. A NULLABLE OBJECT, not two nullable
 * fields: a position without a rotation is half an answer.
 */
export const TeardownPartPlacementSchema = z
  .object({
    positionMm: NumberTripleSchema,
    /** Euler XYZ, degrees — the unit a CAD tool shows, converted once by the engine. */
    rotationDegrees: NumberTripleSchema,
  })
  .strip();
export type TeardownPartPlacement = z.infer<typeof TeardownPartPlacementSchema>;

/**
 * A part that IS its own `.glb` — ONE FILE PER PART, which is the shape an upload takes. This is
 * the arm a future `blueprint_part` row with a file column maps onto one to one, on the
 * `commerce_product_model` precedent (Cloudinary raw, magic-byte validated, public CORS-open URL).
 */
export const IndividualTeardownPartSchema = z
  .object({
    ...TeardownPartBaseShape,
    model: TeardownModelFileSchema,
    placement: TeardownPartPlacementSchema.nullable(),
  })
  .strip();
export type IndividualTeardownPart = z.infer<typeof IndividualTeardownPartSchema>;

/** Either part shape — what the engine and the HUD read; they never need to know which. */
export type TeardownPart = CompositeTeardownPart | IndividualTeardownPart;

/**
 * THE STACKING AXIS OF A LAYERED EXPLOSION, or `null` for the radial default.
 *
 * A radial explosion pushes every part away from the assembly centre, which needs no authoring and
 * works on anything — but it scatters. Real exploded diagrams fan along ONE axis in the order the
 * thing is built, which is what makes them readable, and that ordering is a fact about the product
 * that only its author knows. So it is opt-in: name the axis here and give every part a
 * `layerIndex`.
 *
 * THIS IS THE PHYSICAL STACKING AXIS, NOT A SCREEN DIRECTION. A controller whose boards stack
 * vertically has a `[0, 1, 0]` axis however the camera is later placed; the reference designs read
 * left-to-right because the camera is angled to a front-to-back stack, not because the parts fan
 * sideways.
 */
const TeardownExplosionAxisShape = {
  explosionAxis: NumberTripleSchema.refine(
    (axis) => axis.some((component) => component !== 0),
    "An explosion axis cannot be the zero vector.",
  ).nullable(),
};

/**
 * ALL PARTS LAYERED, OR NONE. A half-layered assembly — some parts on planes along the axis, the
 * rest fanning radially from the centre — is a picture that reads as broken, and nothing should be
 * able to express it.
 */
function addExplosionLayeringIssues(
  explosionAxis: readonly number[] | null,
  parts: readonly { readonly layerIndex: number | null }[],
  context: z.RefinementCtx,
): void {
  parts.forEach((part, index) => {
    if (explosionAxis !== null && part.layerIndex === null) {
      context.addIssue({
        code: "custom",
        path: ["parts", index, "layerIndex"],
        message: "This assembly explodes along an axis, so every part needs a layerIndex.",
      });
    }
    if (explosionAxis === null && part.layerIndex !== null) {
      context.addIssue({
        code: "custom",
        path: ["parts", index, "layerIndex"],
        message: "A layerIndex means nothing without an explosionAxis on the assembly.",
      });
    }
  });
}

/**
 * The tree is checked HERE, not in the engine. A `parentPartId` that names nothing, a part that is
 * its own ancestor, or two parts claiming one id is a malformed row — and `parseBlueprint` throws
 * on a malformed fixture on purpose (`api.ts:32-38`). Left to the engine it would surface as a
 * blank viewport at render time, on the client, where nobody is watching. The backend re-validates
 * the same rule on write (CLAUDE.md §1.1); this is the second line, exactly as
 * `url-source.schemas.ts` is.
 */
function addPartTreeIssues(
  parts: readonly { readonly id: string; readonly parentPartId: string | null }[],
  context: z.RefinementCtx,
): void {
  const partIds = new Set<string>();
  parts.forEach((part, index) => {
    if (partIds.has(part.id)) {
      context.addIssue({
        code: "custom",
        path: ["parts", index, "id"],
        message: `Part id "${part.id}" appears twice.`,
      });
    }
    partIds.add(part.id);
  });

  const parentIdByPartId = new Map(parts.map((part) => [part.id, part.parentPartId]));
  parts.forEach((part, index) => {
    if (part.parentPartId === null) return;
    if (!partIds.has(part.parentPartId)) {
      context.addIssue({
        code: "custom",
        path: ["parts", index, "parentPartId"],
        message: `"${part.parentPartId}" is not a part of this assembly.`,
      });
      return;
    }
    // Walk upward. A walk longer than the part count has looped.
    let ancestorId: string | null = part.parentPartId;
    let hopCount = 0;
    while (ancestorId !== null && hopCount <= parts.length) {
      if (ancestorId === part.id) {
        context.addIssue({
          code: "custom",
          path: ["parts", index, "parentPartId"],
          message: `"${part.id}" is its own ancestor.`,
        });
        return;
      }
      ancestorId = parentIdByPartId.get(ancestorId) ?? null;
      hopCount += 1;
    }
  });
}

/**
 * The model plus the parts worth exploding — TWO INGESTION MODES, as a discriminated union.
 *
 * `composite` is one `.glb` whose named nodes are the parts. `individual_parts` is one `.glb` PER
 * PART — the shape a user upload takes. A union rather than nullable `nodeName`/`model` fields
 * because in per-part mode `nodeName` is meaningless (the file IS the part) and in composite mode
 * a per-part `model` is a contradiction; neither state should be expressible.
 *
 * `parts` IS A SUBSET OF THE TEARDOWN, not the whole of it: `partCount` on the arm is the author's
 * tally (148 on the solar controller) and the model lists the nine that move. Neither number is
 * derived from the other.
 */
export const CompositeTeardownAssemblySchema = z
  .object({
    kind: z.literal("composite"),
    ...TeardownExplosionAxisShape,
    model: TeardownModelFileSchema,
    parts: z.array(CompositeTeardownPartSchema).min(1),
  })
  .strip()
  .superRefine((assembly, context) => {
    addPartTreeIssues(assembly.parts, context);
    addExplosionLayeringIssues(assembly.explosionAxis, assembly.parts, context);
    const nodeNames = new Set<string>();
    assembly.parts.forEach((part, index) => {
      if (nodeNames.has(part.nodeName)) {
        context.addIssue({
          code: "custom",
          path: ["parts", index, "nodeName"],
          message: `Two parts claim the node "${part.nodeName}".`,
        });
      }
      nodeNames.add(part.nodeName);
    });
  });
export type CompositeTeardownAssembly = z.infer<typeof CompositeTeardownAssemblySchema>;

export const IndividualPartsTeardownAssemblySchema = z
  .object({
    kind: z.literal("individual_parts"),
    ...TeardownExplosionAxisShape,
    parts: z.array(IndividualTeardownPartSchema).min(1),
  })
  .strip()
  .superRefine((assembly, context) => {
    addPartTreeIssues(assembly.parts, context);
    addExplosionLayeringIssues(assembly.explosionAxis, assembly.parts, context);
  });
export type IndividualPartsTeardownAssembly = z.infer<typeof IndividualPartsTeardownAssemblySchema>;

export const TeardownAssemblySchema = z.discriminatedUnion("kind", [
  CompositeTeardownAssemblySchema,
  IndividualPartsTeardownAssemblySchema,
]);
export type TeardownAssembly = z.infer<typeof TeardownAssemblySchema>;

/**
 * One line of the fastener table.
 *
 * `sizeLabel` IS A DESIGNATION, NOT A MEASUREMENT, which is why it is a string on a surface that
 * refuses display strings for numbers. "M3 × 8", "#6-32 × ½″" and "12 mm × 40 mm" (an adhesive
 * strip) are names from three different standards and do not reduce to one pair of numbers.
 *
 * `standardCode` IS NULL FOR A PROPRIETARY PART — a moulded snap or a 3M strip has no ISO number,
 * and "N/A" would be the display-string failure again.
 *
 * `supplier` REUSES `BlueprintLinkSchema`: a labelled link that may leave the site is exactly what
 * a supplier row is. `null` when the author named no source.
 */
export const TeardownFastenerSchema = z
  .object({
    standardCode: z.string().nullable(),
    sizeLabel: z.string(),
    drive: TeardownFastenerDriveSchema,
    quantity: z.number().int().positive(),
    supplier: BlueprintLinkSchema.nullable(),
  })
  .strip();
export type TeardownFastener = z.infer<typeof TeardownFastenerSchema>;

/**
 * A file a shop machines from or a fab house builds from — a download, never an embed.
 *
 * NOT A `BlueprintDocument`, and the split is the whole point. A document is a PDF that
 * `BlueprintDocumentViewer` opens inline through `<embed>`; a STEP, a Gerber or a CSV has no
 * inline reading and a View button over one would embed binary. Folding these into `documents[]`
 * would grow `BLUEPRINT_DOCUMENT_KIND_LABELS`, put a per-kind `switch` inside the viewer, give a
 * CSV a `pageCount`, and make the index card's "{n} files" pill count two different claims as one.
 * Two arrays, two enums, two renderers.
 */
export const TeardownManufacturingFileSchema = z
  .object({
    id: z.string(),
    kind: TeardownManufacturingFileKindSchema,
    title: z.string(),
    url: createHttpsOrSiteRelativeUrlSchema(2048),
    byteSize: z.number().int().positive(),
  })
  .strip();
export type TeardownManufacturingFile = z.infer<typeof TeardownManufacturingFileSchema>;

/**
 * One numbered disassembly step — the "01", "02" of the walkthrough.
 *
 * `stepNumber` IS STORED AND ALSO CHECKED AGAINST ARRAY ORDER (see the arm's refinement). It is
 * redundant on a correct payload, which is the point: it is the numeral the author typed and the
 * numeral the page prints, and a backend that returned rows out of order would fail the contract
 * rather than print "01, 03, 02".
 *
 * ⚠️ A STEP CARRIES NO TIMESTAMP, AND IT IS NOT AN OVERSIGHT. It briefly did: a `timestampSeconds`
 * drove a "Play from 0:03" button that seeked the walkthrough. That was restricted to hosted video
 * and then removed with it, because every blueprint video is a YouTube link and **YouTube already
 * gives an author chapters and a scrubbable timeline inside its own player**. A second set here
 * would duplicate a control the reader has while not knowing the chapter titles — the same boundary
 * `/studio/subtitles` records. Do not re-add the field; add chapters to the YouTube video instead.
 */
export const TeardownAssemblyStepSchema = z
  .object({
    stepNumber: z.number().int().positive(),
    title: z.string(),
    description: z.string(),
    /** The part the viewport isolates for this step. `null` when the step is about the whole. */
    focusedPartId: z.string().nullable(),
  })
  .strip();
export type TeardownAssemblyStep = z.infer<typeof TeardownAssemblyStepSchema>;

/** One criterion of the repairability index: a score and the sentence that justifies it. */
export const TeardownRepairabilityCriterionSchema = z
  .object({
    scoreOutOfTen: z.number().int().min(0).max(10),
    note: z.string(),
  })
  .strip();
export type TeardownRepairabilityCriterion = z.infer<typeof TeardownRepairabilityCriterionSchema>;

/**
 * Four criteria and an overall.
 *
 * `overallScoreOutOfTen` IS STORED, NOT AVERAGED ON THE CLIENT. The four criteria are not equally
 * weighted — a device class where fastener uniformity matters more than modularity is an
 * editorial decision, and it belongs to whoever publishes the score. A client that averaged would
 * print a number the author never stated, and a weighting change would need a frontend release.
 * The whole object is nullable rather than its criteria: half an index is not an index.
 */
export const TeardownRepairabilityIndexSchema = z
  .object({
    fastenerUniformity: TeardownRepairabilityCriterionSchema,
    toolAccessibility: TeardownRepairabilityCriterionSchema,
    disassemblyStepCount: TeardownRepairabilityCriterionSchema,
    modularIndependence: TeardownRepairabilityCriterionSchema,
    overallScoreOutOfTen: z.number().int().min(0).max(10),
  })
  .strip();
export type TeardownRepairabilityIndex = z.infer<typeof TeardownRepairabilityIndexSchema>;

/**
 * The figures the telemetry panel prints.
 *
 * THE CLIENT COMPUTES NONE OF THESE. There is no solver in a browser tab and there is no solver on
 * the backend; every number here came off the author's own FEA or test rig, and the page renders
 * it as a claim attributed to them. `stressRating` on a part tints a mesh; it is not an input to
 * any of these and none of these are derived from it.
 *
 * `source` IS A `z.literal`, NOT A ONE-VALUE ENUM, because it is the first arm of a future
 * discriminated union rather than a flag. A `"platform_simulated"` arm, if a backend solver ever
 * exists, will carry fields this arm cannot — a run id, a mesh element count, a computed-at — and
 * `BlueprintMetricValueSchema` above is the precedent for shaping that as
 * `z.discriminatedUnion("source", […])`. Widening a literal into a union is a compile error at
 * every renderer that reads `source`, which is exactly the prompt those renderers should get.
 *
 * `thermalDeltaKelvin` IS SIGNED — a delta can be a drop — and is Kelvin rather than Celsius so
 * nobody reads a rise as an absolute. `maxDisplacementMicrometres` is an integer for the reason
 * cents are: sub-micron is noise on a printed figure.
 */
export const TeardownSimulationTelemetrySchema = z
  .object({
    factorOfSafety: z.number().positive(),
    peakVonMisesStressMegapascals: z.number().nonnegative(),
    maxDisplacementMicrometres: z.number().int().nonnegative(),
    thermalDeltaKelvin: z.number(),
    ratedLoadNewtons: z.number().positive(),
    source: z.literal("author_reported"),
  })
  .strip();
export type TeardownSimulationTelemetry = z.infer<typeof TeardownSimulationTelemetrySchema>;

// --- Provenance, moderation and composition ----------------------------------
//
// THE CLEAN-ROOM LAYER. A teardown on this surface is an EMPIRICAL SURVEY OF A LEGALLY ACQUIRED,
// OFF-THE-SHELF COMMERCIAL UNIT, and the contract is written so that nothing else can be
// expressed. There is no field for a vendor's own drawing, no field for an internal document and
// no field for a file somebody was given under an NDA — a shape that cannot hold leaked material
// is a stronger guarantee than a policy page saying not to upload it.
//
// ⚠️ THE APPROVED VOCABULARY IS IN THE LABEL RECORDS BELOW AND NOWHERE ELSE. "OEM CAD", "Original
// blueprints", "Factory drawings" and "Proprietary specs" are BANNED STRINGS on this surface: each
// one describes material this pipeline must never carry, and a label is what a reader believes.

/**
 * Where a row sits between typed and public.
 *
 * SNAKE_CASE, byte-matching a future `pgEnum`, for the reason the file header gives.
 *
 * The states are not a preference ladder — each one is a different render:
 * - `draft` / `pending_review` / `rejected` — invisible to the public. The detail read returns
 *   `null` and the route 404s. The author sees all three in `/studio/blueprints`.
 *   ⚠️ `rejected` IS NOT `draft`. A draft was never submitted; a rejected submission was reviewed
 *   and turned down, and it carries the moderator's reason, which is the whole reason the author
 *   needs a separate state rather than finding their work silently back in drafts.
 * - `published` — the ordinary state.
 * - `flagged` — somebody has REPORTED an IP concern and nobody has ruled on it. The public view is
 *   UNCHANGED apart from a stated notice: a report is an allegation, and hiding a row on the
 *   strength of one would make the report button a takedown button.
 * - `quarantined` — substantiated, or raised by a verified rights holder. The page still resolves
 *   and states why; the files, the model and the composition are WITHELD rather than deleted.
 * - `removed` — gone. Reads as a 404, identical to a slug that never existed, on the store's
 *   `draft`/`retired` category precedent: a stranger must not be able to probe which rows were
 *   taken down.
 */
export const BLUEPRINT_MODERATION_STATES = [
  "draft",
  "pending_review",
  "published",
  "rejected",
  "flagged",
  "quarantined",
  "removed",
] as const;
export const BlueprintModerationStateSchema = z.enum(BLUEPRINT_MODERATION_STATES);
export type BlueprintModerationState = z.infer<typeof BlueprintModerationStateSchema>;

export const BLUEPRINT_MODERATION_STATE_LABELS: Record<BlueprintModerationState, string> = {
  draft: "Draft",
  pending_review: "Pending review",
  published: "Published",
  rejected: "Not accepted",
  flagged: "IP concern reported",
  quarantined: "Quarantined",
  removed: "Removed",
};

/**
 * What the survey was performed on.
 *
 * ⚠️ MINIMAL BY DESIGN, AND THE PUBLIC ARM CARRIES ONLY ONE OF THE TWO. This exists for the publish
 * and moderation path: a contributor picks a subject kind in the wizard, and `proposed_design` is
 * REFUSED there with a stated reason. A proposed design is not a teardown — there is no unit to
 * measure, so provenance, acquisition and spectroscopy have nothing to describe — and giving it a
 * full shape here would be building the blueprint type this part deliberately does not build.
 * `TeardownBlueprintSchema` therefore pins `subjectKind` to the one publishable literal, which
 * makes the illegal row unconstructible rather than merely discouraged (CLAUDE.md Pattern 1).
 */
export const TEARDOWN_SUBJECT_KINDS = ["existing_physical_product", "proposed_design"] as const;
export const TeardownSubjectKindSchema = z.enum(TEARDOWN_SUBJECT_KINDS);
export type TeardownSubjectKind = z.infer<typeof TeardownSubjectKindSchema>;

export const TEARDOWN_SUBJECT_KIND_LABELS: Record<TeardownSubjectKind, string> = {
  existing_physical_product: "Existing physical product",
  proposed_design: "Proposed design",
};

/** The one subject kind this flow publishes. Anything else is refused before a row is written. */
export const PUBLISHABLE_TEARDOWN_SUBJECT_KIND = "existing_physical_product" as const;

/**
 * WHAT PERMISSION THE SURVEY SITS UNDER, DECLARED BY THE PUBLISHER.
 *
 * ⚠️ THREE KINDS, AND THE FIRST TWO WERE ONCE ONE. `authorized_or_open_source` merged them, on the
 * reasoning that the chip only ever showed two ordinary states and a third enum value with no
 * distinct render looked like an unrendered field. THAT WAS WRONG ON THE SUBSTANCE. "Published
 * under CERN-OHL-S" and "the original manufacturer authorised this teardown" are different
 * permissions carrying different risk: a licence is a PUBLIC DOCUMENT a founder can read and rely
 * on, an authorisation is a PRIVATE ARRANGEMENT between two parties that a third party can neither
 * verify nor inherit. Telling a founder those are the same thing is precisely the class of claim
 * this surface exists to keep honest.
 *
 * ⚠️ THE CHIP VOCABULARY DID NOT GROW WITH IT, AND MUST NOT. There are still exactly THREE chips —
 * see `TEARDOWN_PROVENANCE_CHIPS` — and both authorized kinds resolve to one of them. The data
 * distinguishes the two; the reader's shorthand does not. A fourth badge on a card is a fourth
 * thing to learn before you can read the index, and the distinction only becomes actionable on the
 * detail page, which is where it is drawn.
 *
 * The remaining chip a reader sees — "IP concern reported" — is NOT a provenance kind: it is
 * `moderationState` in `flagged` or `quarantined`. Two fields that could each claim a state the
 * other contradicts is the bag of loose flags Pattern 1 rules out, so the chip is DERIVED from both
 * by `resolveTeardownProvenanceChip` and neither field guesses.
 */
export const BLUEPRINT_PROVENANCE_KINDS = [
  "licensed_open_source",
  "authorized_by_manufacturer",
  "community_reverse_engineered",
] as const;
export const BlueprintProvenanceKindSchema = z.enum(BLUEPRINT_PROVENANCE_KINDS);
export type BlueprintProvenanceKind = z.infer<typeof BlueprintProvenanceKindSchema>;

/** How the publisher came by the unit. Every value is a lawful acquisition; there is no other kind. */
export const TEARDOWN_UNIT_ACQUISITIONS = [
  "retail_purchase",
  "secondary_market",
  "manufacturer_supplied",
  "donated_unit",
] as const;
export const TeardownUnitAcquisitionSchema = z.enum(TEARDOWN_UNIT_ACQUISITIONS);
export type TeardownUnitAcquisition = z.infer<typeof TeardownUnitAcquisitionSchema>;

export const TEARDOWN_UNIT_ACQUISITION_LABELS: Record<TeardownUnitAcquisition, string> = {
  retail_purchase: "Bought at retail",
  secondary_market: "Bought on the secondary market",
  manufacturer_supplied: "Supplied by the manufacturer",
  donated_unit: "Donated unit",
};

/**
 * HOW THE DATA WAS GATHERED, in the approved clean-room vocabulary.
 *
 * ⚠️ THESE LABELS ARE THE POINT OF THE ENUM. Every one of them names a MEASUREMENT the publisher
 * performed. None of them can be read as "the manufacturer's own file", which is what the banned
 * strings in this section's header would imply. Do not add a value that describes a document
 * somebody was handed.
 */
export const TEARDOWN_SURVEY_METHODS = [
  "dimensional_survey",
  "empirical_teardown",
  "material_spectroscopy",
] as const;
export const TeardownSurveyMethodSchema = z.enum(TEARDOWN_SURVEY_METHODS);
export type TeardownSurveyMethod = z.infer<typeof TeardownSurveyMethodSchema>;

export const TEARDOWN_SURVEY_METHOD_LABELS: Record<TeardownSurveyMethod, string> = {
  dimensional_survey: "Independent dimensional survey",
  empirical_teardown: "Empirical teardown analysis",
  material_spectroscopy: "Material spectroscopy & alloy analysis",
};

/** The one-line explanation under each method, so a founder knows what it does and does not prove. */
export const TEARDOWN_SURVEY_METHOD_NOTES: Record<TeardownSurveyMethod, string> = {
  dimensional_survey: "Dimensions measured off the unit, then redrawn from those measurements.",
  empirical_teardown: "The unit disassembled and recorded part by part.",
  material_spectroscopy: "Materials identified by compositional analysis of the unit's own parts.",
};

/** An open-hardware or authorizing licence, named and linked. */
export const BlueprintLicenceSchema = z
  .object({
    /** The licence as it is properly written, e.g. "CERN-OHL-S v2". Never an abbreviation. */
    name: z.string(),
    url: createExternalHttpsUrlSchema(2048),
  })
  .strip();
export type BlueprintLicence = z.infer<typeof BlueprintLicenceSchema>;

/**
 * THE ORIGIN BLOCK — what was surveyed, how it was obtained, and by what methods.
 *
 * It renders ABOVE the bill of materials and above every file on the detail page. That ordering is
 * a rule rather than a layout taste: the files are the thing a reader might redistribute, and a
 * provenance claim that arrives after them is a disclaimer rather than a heading.
 *
 * ⚠️ EACH KIND HAS EXACTLY ONE LEGAL SHAPE, and the refinement below enumerates all three rather
 * than testing two and letting the remainder through:
 *
 * | kind                         | `licence` | `authorizationNote` |
 * | ---------------------------- | --------- | ------------------- |
 * | `licensed_open_source`       | NON-NULL  | `null`              |
 * | `authorized_by_manufacturer` | `null`    | NON-NULL            |
 * | `community_reverse_engineered` | `null`  | `null`              |
 *
 * The earlier version required `licence` for a merged authorized kind, which FORCED a
 * manufacturer-authorised teardown to name a licence it may not hold — a field invented to satisfy
 * a refinement, which is the same defect as a rendered figure nobody measured. Splitting the kind
 * fixed the contract and the bug together.
 */
export const TeardownProvenanceSchema = z
  .object({
    kind: BlueprintProvenanceKindSchema,
    /** The commercial unit surveyed, as the publisher identifies it. Free text: it is somebody else's product name. */
    subjectProductName: z.string(),
    unitAcquisition: TeardownUnitAcquisitionSchema,
    /** At least one — a survey with no method is not a survey. */
    surveyMethods: z.array(TeardownSurveyMethodSchema).min(1),
    /** ISO 8601. When the unit was measured, which is not when the write-up was posted. */
    surveyedAt: z.string(),
    licence: BlueprintLicenceSchema.nullable(),
    /**
     * WHO AUTHORISED THIS SURVEY AND ON WHAT TERMS, in the publisher's own words. Non-null only on
     * `authorized_by_manufacturer`.
     *
     * ⚠️ IT IS NOT A LICENCE AND NO RENDERER MAY DRESS IT AS ONE. A licence is a public document
     * with a name a reader can look up; this is one party's account of a private permission, and
     * the reader inherits nothing from it. Free text rather than a link for exactly that reason —
     * there is usually no public URL to give, and offering the field would invite somebody to point
     * it at a page that says something else.
     */
    authorizationNote: z.string().nullable(),
    /**
     * ISO 8601. WHEN THE PUBLISHER ACCEPTED THE ATTESTATION — legal acquisition, non-destructive or
     * standard method, no NDA or vendor-confidential material, independent discovery. The clauses
     * themselves live in the wizard; this is the record that they were accepted, and it renders,
     * because an attestation nobody can see is an attestation nobody made.
     */
    attestationAcceptedAt: z.string(),
    /** Anything the publisher wants to qualify. `null` renders nothing. */
    notes: z.string().nullable(),
  })
  .strip()
  .superRefine((provenance, context) => {
    /**
     * WHICH OF THE TWO PERMISSION FIELDS EACH KIND MUST CARRY, and which it must leave null. A
     * `Record` over the enum rather than a chain of `if`s, so a fourth kind is a compile error here
     * — the same reason `TEARDOWN_MEDIA_PREDICATES` and `SHOWCASE_SORT_COMPARATORS` are records.
     */
    const requiredPermissionFieldByKind: Record<
      BlueprintProvenanceKind,
      "licence" | "authorizationNote" | null
    > = {
      licensed_open_source: "licence",
      authorized_by_manufacturer: "authorizationNote",
      community_reverse_engineered: null,
    };

    const requiredField = requiredPermissionFieldByKind[provenance.kind];

    if (requiredField === "licence" && provenance.licence === null) {
      context.addIssue({
        code: "custom",
        path: ["licence"],
        message: "An open-source survey must name the licence it is published under.",
      });
    }
    if (requiredField === "authorizationNote" && provenance.authorizationNote === null) {
      context.addIssue({
        code: "custom",
        path: ["authorizationNote"],
        message:
          "A manufacturer-authorized survey must say who authorized it and on what terms. An authorization nobody can read is worth less than it appears.",
      });
    }
    if (requiredField !== "licence" && provenance.licence !== null) {
      context.addIssue({
        code: "custom",
        path: ["licence"],
        message:
          "Only an open-source survey carries a licence. A private authorization is not a licence and must not be recorded as one.",
      });
    }
    if (requiredField !== "authorizationNote" && provenance.authorizationNote !== null) {
      context.addIssue({
        code: "custom",
        path: ["authorizationNote"],
        message: "Only a manufacturer-authorized survey carries an authorization note.",
      });
    }
  });
export type TeardownProvenance = z.infer<typeof TeardownProvenanceSchema>;

/**
 * The three chips a reader can see beside the title, DERIVED from provenance and moderation state.
 *
 * ⚠️ THREE, AND IT STAYS THREE EVEN THOUGH THERE ARE NOW FOUR THINGS TO SAY. `BLUEPRINT_PROVENANCE_KINDS`
 * grew from two to three and this tuple deliberately did NOT follow it: both authorized kinds map to
 * `authorized_or_open_source` here. A chip is the shorthand a reader learns once and then reads at a
 * glance on every card in an index; a fourth badge is a fourth thing to learn before the index is
 * legible, and the licence-versus-authorisation distinction is only actionable on the detail page.
 * So the DATA distinguishes them and the SHORTHAND does not — see `TEARDOWN_PROVENANCE_KIND_NOTES`,
 * which is where the distinction is actually drawn.
 *
 * ⚠️ THE TEXT LABEL IS CANONICAL AND THE COLOUR IS SECONDARY. `docs/Design.md` §6 forbids
 * signalling anything with colour alone, and this is the most consequential signal on the surface —
 * a reader deciding whether they may manufacture something. Renderers pair each chip with a word
 * and a glyph, and the palette stays inside the One Hue Rule: the hue family for the two ordinary
 * states, `Destructive` for the reported one. There is no green and no amber.
 */
export const TEARDOWN_PROVENANCE_CHIPS = [
  "authorized_or_open_source",
  "community_reverse_engineered",
  "ip_concern_reported",
] as const;
export type TeardownProvenanceChip = (typeof TEARDOWN_PROVENANCE_CHIPS)[number];

export const TEARDOWN_PROVENANCE_CHIP_LABELS: Record<TeardownProvenanceChip, string> = {
  authorized_or_open_source: "Authorized / open source",
  community_reverse_engineered: "Community reverse-engineered",
  ip_concern_reported: "IP concern reported",
};

/**
 * What each chip actually promises, in a founder's language rather than a lawyer's.
 *
 * ⚠️ NONE OF THESE SENTENCES SAYS QATOTO CHECKED ANYTHING. Qatoto runs no patent search and makes
 * no clearance claim; the reader is told what the publisher declared and what they must still do
 * themselves. PRODUCT.md's rule about unattributed figures applies with more force to an
 * unattributed legal opinion.
 */
export const TEARDOWN_PROVENANCE_CHIP_NOTES: Record<TeardownProvenanceChip, string> = {
  // COVERS BOTH AUTHORIZED KINDS, so it cannot say "names a licence" — a manufacturer-authorized
  // survey has none. Which of the two it is, and what that is worth to the reader, is
  // `TEARDOWN_PROVENANCE_KIND_NOTES` on the detail page.
  authorized_or_open_source:
    "The publisher declares permission to replicate this commercially. Check what that permission actually covers before you rely on it.",
  community_reverse_engineered:
    "Empirical survey of public hardware. Review patent claims and trade dress in your manufacturing jurisdiction before commercial production.",
  ip_concern_reported:
    "Somebody has reported an intellectual-property concern against this teardown. Nothing here has been ruled on.",
};

/**
 * Which chip each provenance kind wears. THE TWO AUTHORIZED KINDS SHARE ONE — see the tuple above.
 *
 * A `Record` rather than a comparison inside the resolver, so adding a fourth kind forces a decision
 * about which shorthand it takes instead of falling through to whatever the last branch said.
 */
const PROVENANCE_CHIP_BY_KIND: Record<BlueprintProvenanceKind, TeardownProvenanceChip> = {
  licensed_open_source: "authorized_or_open_source",
  authorized_by_manufacturer: "authorized_or_open_source",
  community_reverse_engineered: "community_reverse_engineered",
};

/**
 * THE ONE PLACE THE CHIP IS DECIDED.
 *
 * Moderation outranks provenance: a reported row reads as reported whatever its publisher
 * declared, because that is the fact a reader most needs and the one they cannot check themselves.
 */
export function resolveTeardownProvenanceChip(teardown: {
  readonly provenance: TeardownProvenance;
  readonly moderationState: BlueprintModerationState;
}): TeardownProvenanceChip {
  if (teardown.moderationState === "flagged" || teardown.moderationState === "quarantined") {
    return "ip_concern_reported";
  }
  return PROVENANCE_CHIP_BY_KIND[teardown.provenance.kind];
}

/**
 * WHAT EACH PERMISSION ACTUALLY GIVES THE READER — the distinction the chip deliberately does not
 * draw, spelled out where there is room for it.
 *
 * ⚠️ THE MANUFACTURER SENTENCE MUST NEVER PROMISE INHERITANCE. An authorisation is a permission
 * granted to ONE publisher by ONE counterparty. It does not travel with the files and it gives a
 * reader nothing — a reader who assumes otherwise because the chip said "Authorized" is the exact
 * misreading this record exists to prevent. Read by `TeardownProvenanceBlock`, and only there:
 * the strip states the permission, this states its limit.
 */
export const TEARDOWN_PROVENANCE_KIND_NOTES: Record<BlueprintProvenanceKind, string> = {
  licensed_open_source:
    "Published under an open-hardware licence. The licence is a public document and its terms are what you may rely on, so read it before you commit tooling.",
  authorized_by_manufacturer:
    "The original manufacturer authorized this publisher. That permission was given to them and does not transfer to you with these files; you would need your own.",
  community_reverse_engineered:
    "No licence and no authorization. The survey is the publisher's own measurement of hardware they bought, and any patent or trade-dress question in your manufacturing jurisdiction is still yours to answer.",
};

/** What a material IS, before anything is said about how it was made. */
export const TEARDOWN_MATERIAL_CLASSES = [
  "metal_alloy",
  "polymer",
  "elastomer",
  "composite",
  "ceramic",
  "glass",
  "laminate",
  "semiconductor_package",
  "coating",
  "other",
] as const;
export const TeardownMaterialClassSchema = z.enum(TEARDOWN_MATERIAL_CLASSES);
export type TeardownMaterialClass = z.infer<typeof TeardownMaterialClassSchema>;

export const TEARDOWN_MATERIAL_CLASS_LABELS: Record<TeardownMaterialClass, string> = {
  metal_alloy: "Metal alloy",
  polymer: "Polymer",
  elastomer: "Elastomer",
  composite: "Composite",
  ceramic: "Ceramic",
  glass: "Glass",
  laminate: "Laminate",
  semiconductor_package: "Semiconductor package",
  coating: "Coating",
  other: "Other",
};

/**
 * WHERE THE DESIGNATION CAME FROM, and the single most important field in this section.
 *
 * ⚠️ DECLARED DATA MUST NEVER RENDER AS MEASURED DATA. "6063-T5" read off a supplier's invoice and
 * "6063-T5" concluded from an OES burn are the same eleven characters and completely different
 * claims — one is hearsay about a part, the other is a measurement of it. A manufacturer quoting
 * from the first and a manufacturer quoting from the second are taking different risks, so the
 * source travels with the designation everywhere the designation renders, and no renderer may drop
 * it to save a line.
 */
export const TEARDOWN_DESIGNATION_SOURCES = [
  "measured_spectroscopy",
  "manufacturer_marking",
  "public_datasheet",
  "supplier_declared",
  "contributor_freetext",
] as const;
export const TeardownDesignationSourceSchema = z.enum(TEARDOWN_DESIGNATION_SOURCES);
export type TeardownDesignationSource = z.infer<typeof TeardownDesignationSourceSchema>;

export const TEARDOWN_DESIGNATION_SOURCE_LABELS: Record<TeardownDesignationSource, string> = {
  measured_spectroscopy: "Measured by spectroscopy",
  manufacturer_marking: "Read off the part's own marking",
  public_datasheet: "From a public datasheet",
  supplier_declared: "Declared by a supplier",
  contributor_freetext: "Publisher's own description",
};

/** Whether a designation source is a MEASUREMENT of this unit or a claim about it from elsewhere. */
export const TEARDOWN_DESIGNATION_SOURCE_IS_MEASURED: Record<TeardownDesignationSource, boolean> = {
  measured_spectroscopy: true,
  manufacturer_marking: true,
  public_datasheet: false,
  supplier_declared: false,
  contributor_freetext: false,
};

/**
 * How one element row was determined.
 *
 * ⚠️ THE LAST TWO ARE NOT INSTRUMENTS AND THAT IS DELIBERATE. `declared_not_measured` is the honest
 * value for a percentage copied from a datasheet, and `synthetic_example` is the honest value for a
 * number that was invented — which is what every figure in `@/mocks/blueprints-mocks` is. A table of
 * element percentages is the most measurement-shaped thing on this surface, so it needs a way to
 * say "this was not measured" that a renderer cannot skip. Both values survive into production:
 * real contributors paste datasheet figures too.
 */
export const TEARDOWN_COMPOSITION_ANALYSIS_METHODS = [
  "xrf",
  "oes",
  "eds",
  "icp_oes",
  "declared_not_measured",
  "synthetic_example",
] as const;
export const TeardownCompositionAnalysisMethodSchema = z.enum(
  TEARDOWN_COMPOSITION_ANALYSIS_METHODS,
);
export type TeardownCompositionAnalysisMethod = z.infer<
  typeof TeardownCompositionAnalysisMethodSchema
>;

export const TEARDOWN_COMPOSITION_ANALYSIS_METHOD_LABELS: Record<
  TeardownCompositionAnalysisMethod,
  string
> = {
  xrf: "XRF",
  oes: "OES",
  eds: "EDS",
  icp_oes: "ICP-OES",
  declared_not_measured: "Declared, not measured",
  synthetic_example: "Synthetic example",
};

/** Which analysis methods are an actual measurement of the surveyed unit. */
export const TEARDOWN_COMPOSITION_ANALYSIS_METHOD_IS_MEASURED: Record<
  TeardownCompositionAnalysisMethod,
  boolean
> = {
  xrf: true,
  oes: true,
  eds: true,
  icp_oes: true,
  declared_not_measured: false,
  synthetic_example: false,
};

/**
 * COMMON DESIGNATIONS THE AUTHORING COMBOBOX OFFERS — SUGGESTIONS, NOT AN ENUM.
 *
 * ⚠️ `TeardownMaterialSchema.designation` STAYS `z.string()` AND MUST. This tuple seeds a
 * `CreatableCombobox` so that two publishers spelling the same alloy do not produce two entries
 * nobody can group; the FREE-TEXT ESCAPE IS THE POINT, exactly as `cofounders.schemas.ts` argues
 * for `sector` — "the long tail here is the whole point". A closed enum here would refuse the first
 * unusual polymer somebody actually measured, which is the material most worth recording.
 *
 * Ordered by how often a small hardware build meets them, not alphabetically: the list is read
 * top-down in a dropdown, not scanned.
 */
export const TEARDOWN_DESIGNATION_SUGGESTIONS = [
  "6061-T6",
  "6063-T5",
  "5052-H32",
  "304 stainless",
  "316L stainless",
  "17-4 PH",
  "Mild steel, zinc plated",
  "CC480K bronze",
  "ABS, UL94 V-0",
  "PC/ABS",
  "PA66, 30% glass filled",
  "POM (acetal)",
  "PETG",
  "TPU, 95A",
  "NBR",
  "Silicone, 60A",
  "FR-4",
  "Aluminium-core PCB",
] as const;

/**
 * One element in a material's composition.
 *
 * `weightPercentRange` IS A NULLABLE OBJECT rather than two nullable numbers, on the
 * `billOfMaterialsCostRange` precedent: half a range is an unanswerable question. `null` means the
 * element was IDENTIFIED but not QUANTIFIED, which is the ordinary result of a handheld XRF pass on
 * a trace element and is a different statement from zero percent.
 */
export const TeardownCompositionElementSchema = z
  .object({
    /** The element symbol as chemistry writes it, e.g. "Al", "Mg", "Si". */
    symbol: z.string().min(1).max(3),
    weightPercentRange: z
      .object({
        minimumPercent: z.number().min(0).max(100),
        maximumPercent: z.number().min(0).max(100),
      })
      .strip()
      .refine(
        (range) => range.maximumPercent >= range.minimumPercent,
        "A weight-percent range cannot end below where it starts.",
      )
      .nullable(),
    analysisMethod: TeardownCompositionAnalysisMethodSchema,
    /** The instrument, when one was used. `null` for a declared or synthetic row, and refined below. */
    instrumentLabel: z.string().nullable(),
    /** Whatever the operator wants a reader to know about this row. `null` renders nothing. */
    operatorNote: z.string().nullable(),
  })
  .strip()
  .superRefine((element, context) => {
    if (
      !TEARDOWN_COMPOSITION_ANALYSIS_METHOD_IS_MEASURED[element.analysisMethod] &&
      element.instrumentLabel !== null
    ) {
      context.addIssue({
        code: "custom",
        path: ["instrumentLabel"],
        message: "A row that was not measured cannot name the instrument that measured it.",
      });
    }
  });
export type TeardownCompositionElement = z.infer<typeof TeardownCompositionElementSchema>;

/**
 * ONE MATERIAL RECORD, and the unit the composition section is built out of.
 *
 * ⚠️ IT HANGS OFF THE TEARDOWN, NOT OFF `assembly.parts`. Most teardowns publish no model at all —
 * `thermal-camera-module-teardown` has `assembly: null` — and a composition layer reachable only
 * through a `.glb` would be unavailable on exactly the rows that have nothing else to offer.
 * `partId` LINKS one to a modelled part when there is one, and `appliesToLabel` carries the
 * publisher's own words when there is not.
 *
 * THE REQUIRED SET IS `designation`, `designationSource` AND `materialClass`. `process` and
 * `finish` are NULLABLE INSIDE that set rather than absent from it: a publisher who identified an
 * alloy off a marking usually cannot say how the part was made or what the surface treatment was,
 * and forcing them to would produce a guess wearing the same type as a fact.
 *
 * ELEMENT PERCENTAGES ARE NEVER REQUIRED. `elements: []` is the common case and it renders as a
 * designation row with no disclosure control, not as an empty table.
 */
export const TeardownMaterialSchema = z
  .object({
    id: z.string(),
    /** What this material is the material OF, in the publisher's words, e.g. "Heatsink extrusion". */
    appliesToLabel: z.string(),
    /** A part of this teardown's assembly, when one is modelled. Checked against the parts below. */
    partId: z.string().nullable(),
    /** The standards designation, e.g. "6063-T5", "ABS UL94 V-0", "FR-4". */
    designation: z.string(),
    designationSource: TeardownDesignationSourceSchema,
    materialClass: TeardownMaterialClassSchema,
    /** How the part was made, reusing the method enum the exploded view already prints. `null` = unknown. */
    process: TeardownManufacturingMethodSchema.nullable(),
    /** Surface treatment as the publisher recorded it, e.g. "Clear anodised, 10 µm". `null` = unknown. */
    finish: z.string().nullable(),
    elements: z.array(TeardownCompositionElementSchema),
  })
  .strip();
export type TeardownMaterial = z.infer<typeof TeardownMaterialSchema>;

/** True when any row in a material's element table was invented rather than measured or declared. */
export function hasSyntheticCompositionRow(material: TeardownMaterial): boolean {
  return material.elements.some((element) => element.analysisMethod === "synthetic_example");
}

/**
 * THE PRODUCT CLASS THIS TEARDOWN'S SUBJECT BELONGS TO, which is what the market signal is
 * looked up by.
 *
 * `categorySlug` is a STORE CATEGORY SLUG — kebab, server-generated, the same identity
 * `/store/categories/:slug` answers on. `label` is what a reader sees, and it is stored rather than
 * derived because un-kebabbing a slug into a heading is the wrong move the segment maps at the top
 * of this file already refuse. `null` when the publisher did not place the subject in a class, and
 * `null` means the store half of the market signal is simply absent.
 */
export const TeardownStoreProductClassSchema = z
  .object({
    categorySlug: z.string(),
    label: z.string(),
  })
  .strip();
export type TeardownStoreProductClass = z.infer<typeof TeardownStoreProductClassSchema>;

/**
 * ONE LIVE STORE LISTING, as the market-signal band renders it.
 *
 * ⚠️ A DELIBERATE SUBSET OF `StoreSearchHitSchema` (`src/lib/store/catalog.schemas.ts`), field for
 * field, so that pointing this at `searchStore({ categorySlug })` is a `.map` rather than a
 * redesign. `priceInCents` and `currency` TRAVEL TOGETHER AND ARE BOTH NULLABLE for the reason that
 * schema gives: a quote-only offering has neither, and a price without its currency is
 * unrenderable.
 */
export const TeardownStoreListingSignalSchema = z
  .object({
    productSlug: z.string(),
    title: z.string(),
    organizationDisplayName: z.string(),
    priceInCents: z.number().int().nullable(),
    currency: z.string().nullable(),
  })
  .strip()
  .refine(
    (listing) => (listing.priceInCents === null) === (listing.currency === null),
    "A price and its currency travel together; neither is renderable without the other.",
  );
export type TeardownStoreListingSignal = z.infer<typeof TeardownStoreListingSignalSchema>;

// --- The blueprint union -----------------------------------------------------
//
// ONE SHAPE PER CATEGORY, because the three surfaces ask different questions of a build. A
// teardown publishes files; a showcase is an announcement with a date and a team; a case study is
// a numbered lesson with outcome figures. Modelling that as one object with fifteen optional
// fields would allow a case study with a walkthrough video and a teardown with an upvote count —
// states nothing can render and nothing should be able to express (CLAUDE.md Pattern 1).
//
// THE SHARED FIELDS ARE A SPREAD CONST, NOT A BASE `.extend()`. `z.discriminatedUnion` needs the
// discriminator to be a `z.literal` on each member and `.strip()` to land on the final object;
// `src/lib/store/rfqs.schemas.ts:169` and `src/lib/store/providers.schemas.ts:221` are the two
// precedents this copies.
//
// `difficulty`, `cadFormat` AND `billOfMaterialsCostRange` STAY SHARED even though they read as
// teardown concerns. A rail card renders all three for every category, and moving them into one
// arm would push an exhaustive `switch` down into a card — the wrong place for one. Arms only add.

const BlueprintSharedShape = {
  id: z.string(),
  /** URL identity, kebab-case, stable once published. */
  slug: z.string(),
  title: z.string(),
  summary: z.string(),
  thumbnailUrl: createHttpsOrSiteRelativeUrlSchema(2048),
  author: BlueprintAuthorSchema,
  viewCount: z.number().int().nonnegative(),
  likeCount: z.number().int().nonnegative(),
  difficulty: BlueprintDifficultySchema,
  /** e.g. "STEP / Fusion 360". `null` when no CAD source is published. */
  cadFormat: z.string().nullable(),
  billOfMaterialsCostRange: BlueprintCostRangeSchema.nullable(),
  tags: z.array(z.string()),
  /** ISO 8601. */
  createdAt: z.string(),
};

export const TeardownBlueprintSchema = z
  .object({
    ...BlueprintSharedShape,
    category: z.literal("teardown"),
    /**
     * WHERE THIS ROW SITS BETWEEN TYPED AND PUBLIC. The public getters decide which states they
     * will hand out at all (`src/lib/blueprints/api.ts`); the detail page decides what each one
     * that reaches it looks like. Both halves are needed: a getter that returned a draft would
     * publish an unreviewed row, and a page that rendered a quarantined row identically to a
     * published one would serve withheld files.
     */
    moderationState: BlueprintModerationStateSchema,
    /**
     * PINNED TO THE ONE PUBLISHABLE VALUE, and that is the whole of the subject-kind feature on
     * the read side. `proposed_design` is refused in the wizard with a stated reason; here it is
     * simply not expressible, which is the stronger guarantee. See `TEARDOWN_SUBJECT_KINDS`.
     */
    subjectKind: z.literal(PUBLISHABLE_TEARDOWN_SUBJECT_KIND),
    /** The origin block. NOT NULLABLE — a teardown with no stated provenance may not exist. */
    provenance: TeardownProvenanceSchema,
    /**
     * The composition records. `[]` is ORDINARY, not a defect: most publishers can identify a
     * housing and a board and nothing else, and an empty array renders no section at all.
     */
    materials: z.array(TeardownMaterialSchema),
    /** Which store class the surveyed product belongs to. `null` = the publisher did not place it. */
    storeProductClass: TeardownStoreProductClassSchema.nullable(),
    /**
     * DISPLAY ONLY, both of them, for the reason the showcase arm's `upvoteCount` gives below.
     * There is no comment route and no save route for a blueprint — every engagement table in the
     * backend is hard-FK'd to `video.id` or `product.id` and every route param is `z.uuid()`-gated,
     * so a kebab slug 422s before a query runs. They render in `TeardownEngagementBar` as bare
     * `<span>`s beside `likeCount`, never as buttons.
     *
     * `saveCount` deliberately takes the watch spelling (`video-engagement-bar.tsx` reads
     * `stats.saveCount`) rather than the store's `bookmarkedCount`. Two names for one concept
     * already exist in this repo; this arm picks the older one instead of adding a third.
     */
    commentCount: z.number().int().nonnegative(),
    saveCount: z.number().int().nonnegative(),
    /** `null` when nobody filmed it. Most teardowns are documents only. */
    walkthroughVideo: BlueprintVideoSchema.nullable(),
    /** `[]` when nothing is published yet — an ARRAY, never null: "no files" is a countable state. */
    documents: z.array(BlueprintDocumentSchema),
    /**
     * `null` when nobody counted. Not zero — a zero-part teardown is not a teardown. THE AUTHOR'S
     * TALLY, NOT `assembly.parts.length`: the model lists the parts worth exploding, not every
     * screw, so this may be — and on the solar controller is — far larger.
     */
    partCount: z.number().int().positive().nullable(),
    /** `null` when no model was published. A NULLABLE OBJECT — a model without parts is not a view. */
    assembly: TeardownAssemblySchema.nullable(),
    /** `[]` when the author listed none. Arrays, never null, for the reason `documents` gives. */
    fasteners: z.array(TeardownFastenerSchema),
    manufacturingFiles: z.array(TeardownManufacturingFileSchema),
    assemblySteps: z.array(TeardownAssemblyStepSchema),
    repairabilityIndex: TeardownRepairabilityIndexSchema.nullable(),
    simulationTelemetry: TeardownSimulationTelemetrySchema.nullable(),
  })
  .strip()
  // Cross-field rules that span siblings, so they cannot live on the value objects. zod 4 keeps
  // this a `ZodObject`, which `z.discriminatedUnion` below requires.
  .superRefine((teardown, context) => {
    const partIds = new Set(teardown.assembly?.parts.map((part) => part.id) ?? []);

    teardown.assemblySteps.forEach((step, index) => {
      if (step.stepNumber !== index + 1) {
        context.addIssue({
          code: "custom",
          path: ["assemblySteps", index, "stepNumber"],
          message: `Steps are numbered from 1 in array order; position ${index} carries ${step.stepNumber}.`,
        });
      }
      if (step.focusedPartId !== null && !partIds.has(step.focusedPartId)) {
        context.addIssue({
          code: "custom",
          path: ["assemblySteps", index, "focusedPartId"],
          message: `"${step.focusedPartId}" is not a part of this teardown's assembly.`,
        });
      }
    });

    // A material may name the modelled part it belongs to, and a name that resolves to nothing is
    // the same class of error a step's `focusedPartId` is: it renders as a link to a part the
    // viewer cannot focus. `null` is always legal — most materials describe an unmodelled part.
    teardown.materials.forEach((material, index) => {
      if (material.partId !== null && !partIds.has(material.partId)) {
        context.addIssue({
          code: "custom",
          path: ["materials", index, "partId"],
          message: `"${material.partId}" is not a part of this teardown's assembly.`,
        });
      }
    });
  });

export const ShowcaseBlueprintSchema = z
  .object({
    ...BlueprintSharedShape,
    category: z.literal("showcase"),
    /** One line beside the title in the feed. Not the summary — this is the pitch. */
    tagline: z.string(),
    /**
     * The maker's write-up. `null` when nobody wrote one, which is the ordinary state of a launch
     * posted the day it shipped — and `null` renders NOTHING, not an empty section and not a
     * prompt to write one.
     *
     * ⚠️ PLAIN TEXT, SPLIT ON BLANK LINES AT RENDER. Not markdown, and that was a decision rather
     * than a shortcut: a markdown subset needs a parser and a sanitiser, and user-generated HTML
     * rendered by a thin untrusted layer is the highest-risk thing this surface could carry. The
     * renderer emits `<p>` and nothing else — there is no `dangerouslySetInnerHTML` on this path
     * and none may be added to it.
     *
     * THE THIRD DESCRIPTION-ISH FIELD ON THIS ARM, and the three do different jobs. `tagline` is
     * the pitch on the feed row, `summary` is the one-paragraph "what is this" and doubles as the
     * hub lane's copy, and this is the depth. They are sized apart on the detail page precisely so
     * a reader can tell three things from one paragraph that got long.
     */
    writeUp: z.string().nullable(),
    /**
     * ISO 8601. THE FEED SORTS BY THIS, NOT `createdAt`. A launch is announced on a date its
     * author chose; the row's creation timestamp is an implementation detail of when it was typed.
     */
    launchedAt: z.string(),
    /**
     * DISPLAY ONLY. There is no vote endpoint and no vote button — a counter a client can
     * increment is a business rule enforced on an untrusted layer, which CLAUDE.md §1.1 forbids
     * outright. This renders — as `ShowcaseVoteBox`, a bare `<span>` in a fixed gutter, never a
     * `<button>` — and nothing in this repo changes it.
     */
    upvoteCount: z.number().int().nonnegative(),
    /**
     * DISPLAY ONLY, for the reason `upvoteCount` gives directly above, and it is the count of the
     * thread `BlueprintCommentThread` renders — not an independent number. A count that disagreed
     * with the rows beside it would be the one lie this surface cannot tell while claiming the
     * discussion is real.
     *
     * ON THE SHOWCASE ARM, NOT `BlueprintSharedShape`. A case study is a numbered lesson with no
     * discussion surface, and a shared field exists only for what a rail card renders for every
     * category. The teardown arm carries its own for the same reason.
     */
    commentCount: z.number().int().nonnegative(),
    team: z.array(BlueprintTeamMemberSchema),
    /** The teardown this was built from, `null` when it was built from nothing published here. */
    builtFromBlueprintSlug: z.string().nullable(),
    demoVideo: BlueprintVideoSchema.nullable(),
    callToAction: BlueprintLinkSchema.nullable(),
  })
  .strip();

/**
 * A case study — what somebody learned the expensive way, written as a record rather than an essay.
 *
 * ⚠️ THE SHARED `title` IS THE LESSON, AND IT IS AN IMPERATIVE SENTENCE. "Keep 40% of the raise for
 * batch two", not "Batch-two capital planning". There is deliberately NO separate `lessonTitle`:
 * two titles that can disagree is a worse problem than one field carrying a strong convention, and
 * the rail card, the index row and the detail head must all say the same thing.
 *
 * ⚠️ `conceptNumber` AND THE DISCIPLINE TINT ARE GONE. The index used to be a numbered, colour-coded
 * card grid on the lawsofux.com model, which was two violations of `docs/Design.md` at once: §6
 * "Don't repeat an identical card grid" and §3's Serif Boundary — "a serif heading inside `(home)`
 * is a bug". The numeral rendered nowhere else, and a field nothing displays is the unverified code
 * the field sweep in CLAUDE.md exists to catch, so it was deleted rather than kept as legacy.
 *
 * `discipline` SURVIVED because it earns its place twice over: it is the index's filter facet
 * (`listCaseStudies` takes it) and a chip on the row. `sector` is not a duplicate of it — one is a
 * typed axis that filters, the other is free text that describes, and
 * `cofounders.schemas.ts:175` makes the argument for the free-text half: "Not an enum: the long
 * tail here is the whole point."
 *
 * ⚠️ THERE IS NO OUTCOME ENUM, AND THAT IS A DECISION. A `scaled | failed | pivoted` badge was
 * specified and rejected. `cofounders.schemas.ts:186-188` states the reason for the identical field
 * it already carries: "Plenty of ventures have no tidy outcome, and a renderer that requires one
 * invites people to invent one." A three-value verdict is also an unattributed JUDGMENT, which
 * PRODUCT.md's "an unattributed figure reads as invented" bans more strongly than it bans an
 * unattributed number — and badging a named `evidenceCompanies[]` entry "failed" on fabricated
 * fixtures is not the same kind of invention as fabricating a teardown. `outcomeSummary` is a free
 * clause, and `null` renders NOTHING rather than "Unknown".
 */
export const CaseStudyBlueprintSchema = z
  .object({
    ...BlueprintSharedShape,
    category: z.literal("case_study"),
    /** The typed axis the index filters on, and a chip on the row. */
    discipline: BlueprintDisciplineSchema,
    /** The imperative the reader can act on, one line, under the title. */
    oneLineAction: z.string(),
    /** What happened after. `null` = nobody can say tidily; it is not "Unknown" and not a failure. */
    outcomeSummary: z.string().nullable(),
    /** Free text, e.g. "Hardware". Not an enum — see the note above. */
    sector: z.string(),
    evidenceCompanies: z.array(CaseStudyEvidenceCompanySchema),
    problem: z.string(),
    context: z.string(),
    /** What they did, in order. */
    actionSteps: z.array(z.string()),
    /** What to avoid. Not the inverse of `actionSteps` — these are the things that went wrong. */
    pitfalls: z.array(z.string()),
    /** Free text, e.g. "14 months, two production runs". `null` when nobody recorded it. */
    timelineLabel: z.string().nullable(),
    /**
     * What they raised, in integer minor units.
     *
     * THE OBJECT IS NULLABLE, NOT ITS FIELDS, for the reason `billOfMaterialsCostRange` is: an
     * amount without a currency is an unanswerable question. `null` MEANS NOT DISCLOSED and it is
     * NOT ZERO — the row must say nothing about money rather than say a number.
     *
     * ⚠️ NO COPY BESIDE THIS FIGURE MAY SAY paid, collected, held, escrowed or processed.
     * Qatoto operates no money rail (`src/lib/rnd/pitches.schemas.ts`).
     */
    capitalRaised: BlueprintMoneySchema.nullable(),
    outcomeMetrics: z.array(BlueprintOutcomeMetricSchema),
    /**
     * Where the figures came from. EMPTY IS THE ONE ABSENCE ON THIS SURFACE THAT RENDERS SOMETHING
     * — see `case-study-detail-page.tsx`, which explains the departure from Principle 2.
     */
    sources: z.array(BlueprintSourceSchema),
    /** Slugs of other case studies. Resolved by `listRelatedCaseStudies`, never by a component. */
    relatedLessonSlugs: z.array(z.string()),
  })
  .strip();

export const BlueprintSchema = z.discriminatedUnion("category", [
  TeardownBlueprintSchema,
  ShowcaseBlueprintSchema,
  CaseStudyBlueprintSchema,
]);
export type Blueprint = z.infer<typeof BlueprintSchema>;

export type TeardownBlueprint = z.infer<typeof TeardownBlueprintSchema>;
export type ShowcaseBlueprint = z.infer<typeof ShowcaseBlueprintSchema>;
export type CaseStudyBlueprint = z.infer<typeof CaseStudyBlueprintSchema>;

/** The arm belonging to one category — what the narrowed getters in `api.ts` return. */
export type BlueprintOfCategory<TCategory extends BlueprintCategory> = Extract<
  Blueprint,
  { category: TCategory }
>;

// --- Discussion --------------------------------------------------------------

/**
 * One comment on a showcase.
 *
 * ⚠️ THREADING IS ONE LEVEL, AND THAT IS A BACKEND FACT, NOT A LAYOUT CHOICE. A `parentCommentId`
 * points at a top-level comment and nothing else: the video thread this mirrors records the rule at
 * `video-comment-thread.tsx:132` — "One level only — the backend 409s a reply on a reply". Hacker
 * News nests without limit, and modelling that here would produce a renderer the eventual endpoint
 * cannot feed. There is deliberately NO `depth` field, because a depth that can only be 0 or 1 is
 * `parentCommentId === null` spelled twice.
 *
 * NO `viewerState`, which the video comment carries. It answers questions only a session can ask —
 * has this reader liked it, may they edit it, may they delete it — and this surface has no session
 * to ask them of. Every engagement table in the backend is hard-FK'd to `video.id` or `product.id`,
 * and no blueprints content table exists for a comment row to reference. It arrives with the write
 * surface (todo.md §Blueprint discussion, Part 2) and not before.
 *
 * ⚠️ `body` AND `author` ARE NULLABLE TOGETHER, AND BOTH `null` IS A TOMBSTONE. This file previously
 * argued the opposite — "a tombstone is a state only deletion can create" — and that was true about
 * the WRITE and wrong about the RENDER. The fixtures exercise the render ahead of the delete route,
 * because the layout it has to hold up is the one thing the eventual backend cannot change its mind
 * about: a deleted comment's row SURVIVES so its replies keep their anchor, and a renderer that
 * drops the node would orphan replies the server still returns. There is deliberately NO `isDeleted`
 * flag beside them, because a boolean that can only agree with `body === null` is the same fact
 * spelled twice and the video comment's own pair is the drift this avoids.
 *
 * `author` GOES WITH `body` RATHER THAN SURVIVING IT. A tombstone that kept its byline would still
 * be attributing a comment that was removed, which is worse than saying nothing: the reader learns
 * who said the thing they are not allowed to read.
 *
 * THE AUTHOR SHAPE IS REUSED. `BlueprintAuthorSchema` already spells a person on this surface; a
 * second one would be a third spelling of the same concept.
 */
export const BlueprintCommentSchema = z
  .object({
    commentId: z.string(),
    /** `null` is a top-level comment. A reply's own replies are not a state that exists. */
    parentCommentId: z.string().nullable(),
    /** `null` is a tombstone, and `author` is `null` with it. Never an empty string. */
    body: z.string().nullable(),
    /** `null` on a tombstone only. See the note above. */
    author: BlueprintAuthorSchema.nullable(),
    /**
     * DISPLAY ONLY. No comment-like route exists any more than a vote route does, so this renders as
     * a `<span>` and never as a `<button>`.
     */
    likeCount: z.number().int().nonnegative(),
    /** ISO 8601. */
    createdAt: z.string(),
  })
  .strip();
export type BlueprintComment = z.infer<typeof BlueprintCommentSchema>;

/**
 * One keyset page of blueprints.
 *
 * THE FOOTER IS REUSED, NOT REDEFINED. `CursorPage` comes from `src/lib/store/shared.schemas.ts`,
 * whose comment states the one thing that must never drift is the page footer — a domain that
 * spelled it `{ cursor, more }` would make `CursorPageControl` un-shareable, and this surface
 * renders that exact control.
 *
 * Only the TYPE is imported today, because these pages are BUILT by the fixture getters rather
 * than parsed off the wire. When a real endpoint answers, the getter parses
 * `cursorPageOf(TeardownBlueprintSchema)` from the same file and every caller here is unchanged.
 */
export interface BlueprintPage<TBlueprint> {
  readonly items: readonly TBlueprint[];
  readonly page: CursorPage;
}

// `BlueprintCardFields` USED TO LIVE HERE and was deleted with `BlueprintCardBody`, its only
// consumer. It was the "everything a card renders, whichever arm it came from" projection, which
// stopped being a real idea the moment the three arms stopped sharing one card: a teardown card
// leads with a BOM band and a part count, a case study is a row of text with no thumbnail at all,
// and a showcase carries an upvote gutter. An exported type nothing imports is the same unverified
// code the field sweeps in CLAUDE.md exist to catch, so it went rather than being kept "in case".
