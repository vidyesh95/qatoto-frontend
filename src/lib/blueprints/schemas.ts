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

/** One-line framing for each rail heading. Kept beside the labels so the two never drift. */
export const BLUEPRINT_CATEGORY_BLURBS: Record<BlueprintCategory, string> = {
  teardown: "Schematics, CAD breakdowns and bills of materials, pulled apart part by part.",
  showcase: "Working prototypes and finished builds, made from the blueprints above.",
  case_study: "What happened after the build — volumes, unit economics, go-to-market.",
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
  });

export const ShowcaseBlueprintSchema = z
  .object({
    ...BlueprintSharedShape,
    category: z.literal("showcase"),
    /** One line beside the title in the feed. Not the summary — this is the pitch. */
    tagline: z.string(),
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
 * NO `viewerState` AND NO `isDeleted`, which the video comment carries. Both answer questions only a
 * session and a moderation surface can ask, and this surface has neither — every engagement table in
 * the backend is hard-FK'd to `video.id` or `product.id`, and no blueprints content table exists for
 * a comment row to reference. `body` is therefore plain `z.string()` rather than nullable: a tombstone
 * is a state only deletion can create.
 *
 * THE AUTHOR SHAPE IS REUSED. `BlueprintAuthorSchema` already spells a person on this surface; a
 * second one would be a third spelling of the same concept.
 */
export const BlueprintCommentSchema = z
  .object({
    commentId: z.string(),
    /** `null` is a top-level comment. A reply's own replies are not a state that exists. */
    parentCommentId: z.string().nullable(),
    body: z.string(),
    author: BlueprintAuthorSchema,
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

/** Everything a card renders, whichever arm it came from. */
export type BlueprintCardFields = Pick<
  Blueprint,
  | "slug"
  | "title"
  | "category"
  | "summary"
  | "thumbnailUrl"
  | "author"
  | "difficulty"
  | "billOfMaterialsCostRange"
>;
