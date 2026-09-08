// Fixtures for the Blueprints hub during the UI-building phase.
//
// NOTHING HERE IS REAL. These are invented builds with invented numbers, and they exist so the
// hub can be designed before there is inventory to fill it. `todo.md` records the standing
// precedent for exactly this state — YouTube did not ship Movies & Shows as a browse skeleton —
// so this file is a decision to be revisited when the first real teardown is published, not a
// staging area that quietly becomes production.
//
// IMPORT SITES NEVER SEE THIS FILE. Everything goes through `@/lib/blueprints/api`, which parses
// each fixture through `BlueprintSchema` before returning it. That is the difference from how
// `@/mocks/anime-mocks` was wired — its components imported the arrays directly, so pointing them
// at a backend meant rewriting the components rather than one getter.
//
// THE SPLIT HERE IS 12 / 10 / 5, NOT 70/20/10, and that is deliberate. The 70/20/10 ratio is a
// content target for REAL builds; applied to fixtures it gave two showcases and two case studies,
// and a launch feed of two rows or a numbered index of two cards does not exercise its own
// design — it reads as broken. The two small buckets are over-sampled so the layouts can be built
// against something that looks like use. There are exactly five case studies because there are
// five disciplines, and a discipline with no fixture is a card tint nobody ever sees. There are
// TEN showcases rather than five because the launch feed has a Newest | Top toggle, and a toggle
// has to show two visibly different orders and still page under both — five rows did neither.
//
// THE LAUNCH DATES ARE STATIC LITERALS inside the three weeks before 2026-09-08, and they drift
// into the past one day at a time. Accepted: a `new Date()`-relative fixture would bake a
// different order into every `"use cache"` entry, and `RelativeTime` renders whatever the gap is.
// Re-date them when the feed starts to read as abandoned.

import type {
  Blueprint,
  BlueprintDocument,
  BlueprintVideo,
  TeardownManufacturingFile,
} from "@/lib/blueprints/schemas";

/** USD throughout; a real payload would carry the seller's own currency per row. */
const UNITED_STATES_DOLLAR = "USD";

/**
 * EVERY FIXTURE VIDEO IS THE SAME TEN-SECOND CLIP, because it is the only real video asset in
 * `public/`. Pointing at invented filenames would give a player a 404 and make the "video is
 * present" branch untestable, which is the opposite of what a fixture is for. The duration is the
 * file's true duration, not a prettier invented one — a badge reading "8:12" over a ten-second
 * clip is a lie the first person to click it discovers.
 */
const PLACEHOLDER_VIDEO_URL = "/dummy/video/Sintel_1080_10s_1MB.mp4";
const PLACEHOLDER_VIDEO_DURATION_SECONDS = 10;

/**
 * A real WebVTT, authored for this clip, whose cue text says it is a placeholder.
 *
 * ⚠️ NOT `/dummy/video/sintel-thumbnails.vtt`, which sits next to the clip and is a STORYBOARD
 * track — its cues are `sintel-storyboard.jpg#xywh=…` sprite coordinates for seek-bar previews
 * (`src/types/video.ts:57`). Mounted as `kind="captions"` it renders image URLs as subtitles.
 */
const PLACEHOLDER_CAPTIONS_URL = "/dummy/blueprints/walkthrough-captions.vtt";

/**
 * THE ONE YOUTUBE FIXTURE — and it is the SAME FILM as the clip above, delivered the other way.
 *
 * `eRsGyueVLvQ` is the Blender Foundation's own upload of Sintel, resolved against YouTube's
 * oEmbed endpoint when it was added. Using the same placeholder for both video arms is what keeps
 * this file's "NOTHING HERE IS REAL" doctrine intact: the two arms read as two delivery
 * mechanisms for one stand-in, rather than one real video smuggled in beside a stand-in.
 *
 * WHY AN INSTITUTION'S UPLOAD AND NOT A TEARDOWN CHANNEL. A made-up id parses fine and then gives
 * a dead player, leaving the whole YouTube arm untestable — the exact failure the clip above
 * exists to avoid. An individual creator's video breaks the same way the day they delete it;
 * Blender's has been up since 2010, is CC-BY, and is not going to have embedding switched off by
 * someone reorganising a channel.
 *
 * ⚠️ THE DURATION IS THE FILM'S TRUE RUNTIME, read from the player, not typed from memory — the
 * rule the header above states. It is load-bearing once: the poster badge shows it. It used to be
 * load-bearing twice, because the arm's refinement bounded every step timestamp against it, but
 * step timestamps are hosted-only now and a YouTube walkthrough carries none.
 */
const PLACEHOLDER_YOUTUBE_VIDEO_ID = "eRsGyueVLvQ";
const PLACEHOLDER_YOUTUBE_DURATION_SECONDS = 888;

/**
 * TWO OF THE EIGHT FIXTURE VIDEOS CARRY CAPTIONS, and six do not.
 *
 * Deliberately a mix. Captions on every video would let the contract imply that a real upload
 * always has them, which is false; captions on none left the `<track>` branch in
 * `blueprint-video-block.tsx` unexercised, which is how it shipped and is what this fixes. One
 * walkthrough (`bp-001`) and one demo (`bp-009`) carry the track, so both branches render on both
 * a teardown page and a showcase page.
 */
function placeholderVideo(posterUrl: string, captionsUrl: string | null = null): BlueprintVideo {
  return {
    source: "hosted",
    url: PLACEHOLDER_VIDEO_URL,
    posterUrl,
    durationSeconds: PLACEHOLDER_VIDEO_DURATION_SECONDS,
    captionsUrl,
  };
}

/**
 * The generated placeholder PDFs in `public/dummy/blueprints/`.
 *
 * `byteSize` and `pageCount` are MEASURED FROM THE FILES ON DISK, not invented. A fixture that
 * claims 4.1 MB over a 1 KB file teaches the renderer nothing about how a real size wraps.
 */
const PLACEHOLDER_DOCUMENTS: Record<string, BlueprintDocument> = {
  solarSchematic: {
    id: "doc-001",
    kind: "schematic",
    title: "Controller schematic, sheets 1-3",
    url: "/dummy/blueprints/solar-cold-storage-schematic.pdf",
    byteSize: 1465,
    pageCount: 3,
  },
  solarBillOfMaterials: {
    id: "doc-002",
    kind: "bill_of_materials",
    title: "Bill of materials, 48 line items",
    url: "/dummy/blueprints/solar-cold-storage-bom.pdf",
    byteSize: 1136,
    pageCount: 2,
  },
  brushlessSchematic: {
    id: "doc-003",
    kind: "schematic",
    title: "Driver schematic and layout notes",
    url: "/dummy/blueprints/brushless-driver-schematic.pdf",
    byteSize: 1120,
    pageCount: 2,
  },
  boreholeAssembly: {
    id: "doc-004",
    kind: "assembly_guide",
    title: "Housing assembly and torque sequence",
    url: "/dummy/blueprints/borehole-pump-assembly.pdf",
    byteSize: 1778,
    pageCount: 4,
  },
  batteryManagementSchematic: {
    id: "doc-005",
    kind: "schematic",
    title: "Balancing and protection schematic",
    url: "/dummy/blueprints/battery-management-schematic.pdf",
    byteSize: 1113,
    pageCount: 2,
  },
  batteryManagementBillOfMaterials: {
    id: "doc-006",
    kind: "bill_of_materials",
    title: "Bill of materials",
    url: "/dummy/blueprints/battery-management-bom.pdf",
    byteSize: 758,
    pageCount: 1,
  },
  sensorNodeDatasheet: {
    id: "doc-007",
    kind: "datasheet",
    title: "Measured power budget",
    url: "/dummy/blueprints/esp32-sensor-node-datasheet.pdf",
    byteSize: 1118,
    pageCount: 2,
  },
  heatExchangerSchematic: {
    id: "doc-008",
    kind: "schematic",
    title: "Plate stack schematic",
    url: "/dummy/blueprints/milk-chiller-heat-exchanger-schematic.pdf",
    byteSize: 758,
    pageCount: 1,
  },
};

/**
 * The generated placeholder fabrication files and `.glb` models in `public/dummy/blueprints/`,
 * written by `scripts/generate-blueprint-fixture-models.mts` (`pnpm fixtures:blueprint-models`).
 *
 * EVERY `byteSize` BELOW IS WHAT THE SCRIPT PRINTED, measured off disk, never typed from memory —
 * the same rule the PDFs above follow. Each text file opens in the tool its extension claims
 * (a STEP header, a DXF entities section, a Gerber, an Excellon drill, two CSVs) and says
 * "placeholder" inside; the models are procedural boxes and cylinders whose node names are the
 * fixture's `nodeName`s, and they are committed exactly as the PDFs were.
 */
const PLACEHOLDER_MANUFACTURING_FILES: Record<string, TeardownManufacturingFile> = {
  solarEnclosureStep: {
    id: "mfg-001",
    kind: "step",
    title: "Enclosure, lid and base",
    url: "/dummy/blueprints/solar-cold-storage-enclosure.step",
    byteSize: 308,
  },
  solarLidGasketDxf: {
    id: "mfg-002",
    kind: "dxf",
    title: "Lid gasket cut path",
    url: "/dummy/blueprints/solar-cold-storage-lid-gasket.dxf",
    byteSize: 132,
  },
  solarTopCopperGerber: {
    id: "mfg-003",
    kind: "gerber",
    title: "Top copper",
    url: "/dummy/blueprints/solar-cold-storage-top-copper.gtl",
    byteSize: 130,
  },
  solarDrill: {
    id: "mfg-004",
    kind: "drill",
    title: "Plated through-holes",
    url: "/dummy/blueprints/solar-cold-storage-drill.drl",
    byteSize: 96,
  },
  solarPickAndPlace: {
    id: "mfg-005",
    kind: "pick_and_place",
    title: "Pick and place, top side",
    url: "/dummy/blueprints/solar-cold-storage-pick-and-place.csv",
    byteSize: 145,
  },
  solarBillOfMaterialsCsv: {
    id: "mfg-006",
    kind: "bill_of_materials_csv",
    title: "Bill of materials, 48 line items",
    url: "/dummy/blueprints/solar-cold-storage-bom.csv",
    byteSize: 163,
  },
};

const PUMP_PART_MODEL_DIRECTORY = "/dummy/blueprints/borehole-pump-housing";

/**
 * Twenty-seven builds across the three arms.
 *
 * DELIBERATE ABSENCES, each one there so its branch renders during development rather than the
 * first time real data arrives:
 *
 * - `billOfMaterialsCostRange: null` on `thermal-camera-module-teardown` and
 *   `nairobi-injection-molding-case-study` — an uncosted build is an ordinary state, and the
 *   renderer must show an absence rather than a $0 band.
 * - `walkthroughVideo: null` AND `documents: []` together on `thermal-camera-module-teardown` and
 *   `low-cost-spectrometer-optical-path` — a teardown that published nothing. The media sections
 *   must be ABSENT, not empty boxes.
 * - `builtFromBlueprintSlug: null` on `dairy-chiller-retrofit-pilot` — a launch built from
 *   something that was never published here.
 * - `cadFormat: null` on `dairy-chiller-retrofit-pilot` and `off-grid-mesh-nodes-kumasi-market` —
 *   a build with no published CAD, so the spec list must omit the row rather than print "—".
 * - `upvoteCount: 96` on BOTH `hand-pump-gearbox-replacement-kit` and
 *   `grain-moisture-meter-field-units` — a deliberate tie, so the `top` comparator's tie-break is
 *   exercised on the second page of `?sort=top` rather than only described in a comment.
 * - `callToAction: null` and `demoVideo: null` on several showcases — most launches have neither.
 * - `partCount: null` where nobody counted. Not zero: a zero-part teardown is not a teardown.
 * - `assembly: null` on ten of the twelve teardowns — most published no model, and the exploded
 *   view must be ABSENT rather than an empty viewport. The two that carry one take DIFFERENT
 *   modes: `solar-cold-storage-controller-teardown` is ONE composite `.glb` addressed by node
 *   name; `borehole-pump-housing-tolerances` is SIX per-part files, the shape an upload takes,
 *   with one part (`seal_carrier`) exported at its own origin so the explicit `placement` branch
 *   renders too.
 * - `fasteners: []`, `manufacturingFiles: []`, `assemblySteps: []` and `repairabilityIndex: null`
 *   TOGETHER on `borehole-pump-housing-tolerances`, which does carry a model and telemetry — a
 *   teardown with a viewport and nothing else, so every other section proves it can be absent on
 *   its own.
 * - `simulationTelemetry` on exactly the two modelled teardowns, at factors of safety 3.1 and 1.6,
 *   so both the safe and the marginal colour bands render somewhere.
 * - `calloutText: null` on one MOSFET, so a part with no pin sits beside parts with pins.
 */
export const MOCK_BLUEPRINTS: Blueprint[] = [
  {
    id: "bp-001",
    slug: "solar-cold-storage-controller-teardown",
    title: "Solar cold-storage controller, board and all",
    category: "teardown",
    summary:
      "The full control board from a 400 L off-grid chest freezer: MPPT stage, compressor driver, and why the thermistor placement costs it four percent of its duty cycle.",
    thumbnailUrl: "/dummy/thumbnail_image01.avif",
    author: {
      displayName: "Amara Okonkwo",
      handle: "amara-builds",
      avatarUrl: "/dummy/profile_image_01.avif",
    },
    viewCount: 48210,
    likeCount: 3104,
    difficulty: "advanced",
    cadFormat: "STEP / KiCad 8",
    billOfMaterialsCostRange: {
      minimumInCents: 4500,
      maximumInCents: 6000,
      currency: UNITED_STATES_DOLLAR,
    },
    tags: ["cold-chain", "solar", "power-electronics", "mppt"],
    createdAt: "2026-08-14T09:12:00.000Z",
    walkthroughVideo: placeholderVideo("/dummy/thumbnail_image01.avif", PLACEHOLDER_CAPTIONS_URL),
    documents: [PLACEHOLDER_DOCUMENTS.solarSchematic, PLACEHOLDER_DOCUMENTS.solarBillOfMaterials],
    // The author's tally. Nine of these are modelled below; 148 is not nine and must not become nine.
    partCount: 148,
    assembly: {
      kind: "composite",
      // THE STACK IS VERTICAL, so the axis is Y: clip, base, board, board-mounted parts, heatsink,
      // lid. Six planes rather than nine directions, which is what makes an exploded diagram
      // readable — the camera angle, not the axis, is what makes it read wide on screen.
      explosionAxis: [0, 1, 0],
      model: {
        url: "/dummy/blueprints/solar-cold-storage-controller.glb",
        byteSize: 351872,
      },
      // `parentPartId` MIRRORS THE NODE TREE IN THE .glb — the generator nests the meshes the same
      // way. A child explodes away from its parent, so the two trees must agree or the lid moves
      // with the board.
      parts: [
        {
          id: "part-001",
          nodeName: "enclosure_base",
          label: "Enclosure base",
          parentPartId: null,
          material: "ABS, UL94 V-0",
          manufacturingMethod: "injection_molded",
          explosionDirection: null,
          explosionDistanceMm: null,
          layerIndex: 1,
          stressRating: null,
          calloutText: "Two-piece ABS shell; the base carries every mounting boss.",
        },
        {
          id: "part-002",
          nodeName: "enclosure_lid",
          label: "Enclosure lid",
          parentPartId: null,
          material: "ABS, UL94 V-0",
          manufacturingMethod: "injection_molded",
          // Pinned: the lid lifts straight up. Not unit length on purpose — the engine normalises.
          explosionDirection: [0, 2, 0],
          explosionDistanceMm: 60,
          layerIndex: 5,
          stressRating: null,
          calloutText: "Lifts straight up once the four M3 cap screws are out.",
        },
        {
          id: "part-003",
          nodeName: "pcb",
          label: "Control board",
          parentPartId: "part-001",
          material: "FR-4, 1.6 mm, 2 oz copper, four layers",
          manufacturingMethod: "pcb_assembly",
          explosionDirection: null,
          explosionDistanceMm: null,
          layerIndex: 2,
          stressRating: 0.2,
          calloutText: "MPPT stage on the left, compressor driver on the right.",
        },
        {
          id: "part-004",
          nodeName: "heatsink",
          label: "Heatsink",
          parentPartId: "part-003",
          material: "6063-T5 aluminium extrusion, cut to length and drilled",
          manufacturingMethod: "cnc_milled",
          explosionDirection: null,
          explosionDistanceMm: null,
          layerIndex: 4,
          stressRating: 0.55,
          calloutText: "Undersized by the author's own measurement — 38 K rise at rated load.",
        },
        {
          id: "part-005",
          nodeName: "mosfet_q1",
          label: "MOSFET Q1 (high side)",
          parentPartId: "part-003",
          material: "IRFP4668, TO-247",
          manufacturingMethod: "off_the_shelf",
          explosionDirection: null,
          explosionDistanceMm: null,
          layerIndex: 3,
          stressRating: 0.85,
          calloutText: "The hottest part on the board.",
        },
        {
          id: "part-006",
          nodeName: "mosfet_q2",
          label: "MOSFET Q2 (low side)",
          parentPartId: "part-003",
          material: "IRFP4668, TO-247",
          manufacturingMethod: "off_the_shelf",
          explosionDirection: null,
          explosionDistanceMm: null,
          layerIndex: 3,
          stressRating: 0.8,
          calloutText: null,
        },
        {
          id: "part-007",
          nodeName: "terminal_block",
          label: "Terminal block",
          parentPartId: "part-003",
          material: "PA66 housing, brass contacts, 10 mm pitch",
          manufacturingMethod: "off_the_shelf",
          explosionDirection: null,
          explosionDistanceMm: null,
          layerIndex: 3,
          stressRating: null,
          calloutText: "Battery, panel and compressor all land here.",
        },
        {
          id: "part-008",
          nodeName: "thermistor_harness",
          label: "Thermistor harness",
          parentPartId: "part-003",
          material: "10 kΩ NTC on twisted pair, PVC jacket",
          manufacturingMethod: "off_the_shelf",
          explosionDirection: null,
          explosionDistanceMm: null,
          layerIndex: 3,
          stressRating: null,
          calloutText:
            "Placed 40 mm from the evaporator plate — the four percent from the summary.",
        },
        {
          id: "part-009",
          nodeName: "din_clip",
          label: "DIN rail clip",
          parentPartId: "part-001",
          material: "Zinc-plated spring steel",
          manufacturingMethod: "sheet_metal",
          explosionDirection: [0, -1, 0],
          explosionDistanceMm: 25,
          layerIndex: 0,
          stressRating: null,
          calloutText: null,
        },
      ],
    },
    fasteners: [
      {
        standardCode: "ISO 4762",
        sizeLabel: "M3 × 8",
        drive: "hex_socket",
        quantity: 4,
        supplier: { label: "McMaster-Carr", url: "https://www.mcmaster.com/91290A113/" },
      },
      {
        standardCode: "ISO 7045",
        sizeLabel: "M3 × 6",
        drive: "phillips",
        quantity: 4,
        supplier: null,
      },
      {
        standardCode: "ISO 4762",
        sizeLabel: "M3 × 12",
        drive: "hex_socket",
        quantity: 2,
        supplier: { label: "McMaster-Carr", url: "https://www.mcmaster.com/91290A120/" },
      },
      {
        standardCode: "ISO 14583",
        sizeLabel: "M3 × 8",
        drive: "torx",
        quantity: 2,
        supplier: { label: "Bossard", url: "https://www.bossard.com/eshop/" },
      },
      {
        standardCode: null,
        sizeLabel: "12 mm × 40 mm strip",
        drive: "adhesive",
        quantity: 1,
        supplier: { label: "3M VHB 5952", url: "https://www.3m.com/" },
      },
      {
        standardCode: null,
        sizeLabel: "35 mm DIN",
        drive: "snap_fit",
        quantity: 1,
        supplier: null,
      },
    ],
    manufacturingFiles: [
      PLACEHOLDER_MANUFACTURING_FILES.solarEnclosureStep,
      PLACEHOLDER_MANUFACTURING_FILES.solarLidGasketDxf,
      PLACEHOLDER_MANUFACTURING_FILES.solarTopCopperGerber,
      PLACEHOLDER_MANUFACTURING_FILES.solarDrill,
      PLACEHOLDER_MANUFACTURING_FILES.solarPickAndPlace,
      PLACEHOLDER_MANUFACTURING_FILES.solarBillOfMaterialsCsv,
    ],
    // Every timestamp is inside the ten-second placeholder clip, because the contract checks it.
    assemblySteps: [
      {
        stepNumber: 1,
        title: "Release the lid",
        description: "Four M3 cap screws, one in each corner. The gasket stays with the lid.",
        timestampSeconds: 0,
        focusedPartId: "part-002",
      },
      {
        stepNumber: 2,
        title: "Lift the board",
        description:
          "Four Phillips screws into the standoffs. Unplug the thermistor harness before lifting or it tears at the crimp.",
        timestampSeconds: 3,
        focusedPartId: "part-003",
      },
      {
        stepNumber: 3,
        title: "Unbolt the heatsink",
        description:
          "Two M3 × 12 through the board into the extrusion. The MOSFETs stay clamped to it.",
        timestampSeconds: 6,
        focusedPartId: "part-004",
      },
      {
        stepNumber: 4,
        title: "Free the terminal block",
        description: "Press-fit into the board; lever from the underside, never pull.",
        timestampSeconds: 9,
        focusedPartId: "part-007",
      },
    ],
    repairabilityIndex: {
      fastenerUniformity: { scoreOutOfTen: 8, note: "All metric, all M3, two drive types." },
      toolAccessibility: {
        scoreOutOfTen: 7,
        note: "Nothing hidden under a label; the heatsink screws need a long driver.",
      },
      disassemblyStepCount: {
        scoreOutOfTen: 7,
        note: "Four steps to the board, nine to the last component.",
      },
      modularIndependence: {
        scoreOutOfTen: 6,
        note: "MOSFETs clamp rather than solder to the heatsink; the harness is potted.",
      },
      overallScoreOutOfTen: 7,
    },
    simulationTelemetry: {
      factorOfSafety: 3.1,
      peakVonMisesStressMegapascals: 24,
      maxDisplacementMicrometres: 310,
      thermalDeltaKelvin: 38,
      ratedLoadNewtons: 50,
      source: "author_reported",
    },
  },
  {
    id: "bp-002",
    slug: "thermal-camera-module-teardown",
    title: "What is actually inside a $180 thermal camera module",
    category: "teardown",
    summary:
      "Desoldering the sensor package to find a two-generation-old microbolometer behind a new part number, plus the calibration table it ships with.",
    thumbnailUrl: "/dummy/thumbnail_image02.avif",
    author: {
      displayName: "Rahul Mehta",
      handle: "rahul-teardown",
      avatarUrl: "/dummy/profile_image_02.avif",
    },
    viewCount: 91455,
    likeCount: 7822,
    difficulty: "advanced",
    cadFormat: null,
    billOfMaterialsCostRange: null,
    tags: ["thermal-imaging", "sensors", "reverse-engineering"],
    createdAt: "2026-08-02T16:40:00.000Z",
    walkthroughVideo: null,
    documents: [],
    partCount: null,
    assembly: null,
    fasteners: [],
    manufacturingFiles: [],
    assemblySteps: [],
    repairabilityIndex: null,
    simulationTelemetry: null,
  },
  {
    id: "bp-003",
    slug: "brushless-motor-driver-schematic",
    title: "A 24 V brushless driver you can actually source in Lagos",
    category: "teardown",
    summary:
      "Schematic and layout for a 15 A BLDC driver built entirely from parts with three or more local distributors — the substitution table is the interesting half.",
    thumbnailUrl: "/dummy/thumbnail_image03.avif",
    author: {
      displayName: "Chidi Eze",
      handle: "chidi-motors",
      avatarUrl: "/dummy/profile_image_03.avif",
    },
    viewCount: 33780,
    likeCount: 2611,
    difficulty: "intermediate",
    cadFormat: "KiCad 8 / Gerber",
    billOfMaterialsCostRange: {
      minimumInCents: 1850,
      maximumInCents: 2400,
      currency: UNITED_STATES_DOLLAR,
    },
    tags: ["motors", "bldc", "sourcing", "power-electronics"],
    createdAt: "2026-07-28T11:05:00.000Z",
    // THE YOUTUBE ARM, on a teardown with NO assembly. The steps below render standalone rather
    // than inside the 3D viewer's tab, and they carry NEITHER affordance — no part to focus and,
    // per the arm's refinement, no timestamp to seek — which is the row this fixture exists to
    // exercise. It briefly carried timestamps and a seek button; see the refinement for why a
    // YouTube walkthrough cannot.
    walkthroughVideo: {
      source: "youtube",
      youtubeVideoId: PLACEHOLDER_YOUTUBE_VIDEO_ID,
      // `hqdefault` rather than `maxresdefault`: the latter 404s for a large share of videos and
      // YouTube answers with a grey 120x90 stub. `**.ytimg.com` is already in
      // `next.config.ts`'s `images.remotePatterns`.
      posterUrl: `https://i.ytimg.com/vi/${PLACEHOLDER_YOUTUBE_VIDEO_ID}/hqdefault.jpg`,
      durationSeconds: PLACEHOLDER_YOUTUBE_DURATION_SECONDS,
    },
    documents: [PLACEHOLDER_DOCUMENTS.brushlessSchematic],
    partCount: 62,
    assembly: null,
    fasteners: [],
    manufacturingFiles: [],
    // ⚠️ BOTH INTERACTIVE FIELDS ARE NULL ON EVERY STEP, AND BOTH HAVE TO BE. `focusedPartId`
    // because the contract only allows a part id that exists in `assembly.parts` and this teardown
    // published no assembly; `timestampSeconds` because the walkthrough is on YouTube, whose own
    // chapters are the timestamps. A step here is prose, and that is the honest rendering.
    assemblySteps: [
      {
        stepNumber: 1,
        title: "What the driver has to survive",
        description:
          "Stall current, the supply rail it actually sees on a long cable run, and the two failures that follow from getting either wrong.",
        timestampSeconds: null,
        focusedPartId: null,
      },
      {
        stepNumber: 2,
        title: "Choosing the gate driver",
        description:
          "Why the obvious part is the one nobody stocks locally, and what the substitution table trades away.",
        timestampSeconds: null,
        focusedPartId: null,
      },
      {
        stepNumber: 3,
        title: "Current sense and the shunt placement",
        description:
          "Low-side sensing, the ground bounce it introduces, and the layout that keeps it measurable.",
        timestampSeconds: null,
        focusedPartId: null,
      },
      {
        stepNumber: 4,
        title: "What to check before you order boards",
        description:
          "The three footprints worth re-reading against the datasheet, and the one clearance that fails a cheap fab.",
        timestampSeconds: null,
        focusedPartId: null,
      },
    ],
    repairabilityIndex: null,
    // ⚠️ TELEMETRY WITH NO ASSEMBLY, WHICH IS THE POINT OF PUTTING IT HERE. The contract has always
    // allowed the combination — a bench test on something nobody modelled is the ordinary case for
    // a board — but until this fixture existed both telemetried teardowns also had models, which
    // hid the fact that `TelemetryReadouts` was mounted INSIDE the 3D viewer and therefore rendered
    // nothing on the unmodelled path. The panel now lives on the detail page; this is what keeps
    // that honest. Delete the model from a fixture and you lose the check, not just the model.
    //
    // These are thermal and electrical bench figures rather than a structural analysis, so the
    // mechanical readouts are the small numbers you would expect of a PCB: a board flexes microns
    // under its own connectors and is rated in the tens of newtons of connector insertion force.
    simulationTelemetry: {
      factorOfSafety: 1.9,
      peakVonMisesStressMegapascals: 41.5,
      maxDisplacementMicrometres: 95,
      thermalDeltaKelvin: 54,
      ratedLoadNewtons: 35,
      source: "author_reported",
    },
  },
  {
    id: "bp-004",
    slug: "borehole-pump-housing-tolerances",
    title: "Borehole pump housing: the four tolerances that matter",
    category: "teardown",
    summary:
      "CAD breakdown of a submersible pump housing, with the fits that decide whether it survives a season of silt and the three that do not matter at all.",
    thumbnailUrl: "/dummy/thumbnail_image04.avif",
    author: {
      displayName: "Grace Wanjiru",
      handle: "grace-mech",
      avatarUrl: "/dummy/profile_image_04.avif",
    },
    viewCount: 27340,
    likeCount: 1988,
    difficulty: "intermediate",
    cadFormat: "STEP / Fusion 360",
    billOfMaterialsCostRange: {
      minimumInCents: 12000,
      maximumInCents: 15500,
      currency: UNITED_STATES_DOLLAR,
    },
    tags: ["pumps", "tolerances", "cad", "water"],
    createdAt: "2026-07-19T08:22:00.000Z",
    walkthroughVideo: null,
    documents: [PLACEHOLDER_DOCUMENTS.boreholeAssembly],
    partCount: 24,
    // ONE FILE PER PART — the shape an upload takes. Five files were exported in assembly
    // coordinates and trust `placement: null`; the seal carrier was exported at its own origin
    // and is put back by an explicit placement, so both branches of the loader render.
    //
    // THE INTERNALS ARE CHILDREN OF THE SHAFT, NOT THE HOUSING, and the housing is pinned to drop
    // straight down: a child rides its parent's explosion, so bearings parented to the housing
    // would sink with it and stay hidden inside a solid casting. Parented to the shaft they lift
    // out with it, which is also how the pump comes apart on a bench.
    assembly: {
      kind: "individual_parts",
      // DELIBERATELY RADIAL. One fixture must keep exercising the centroid path, or it becomes
      // unverified code the day the layered one lands.
      explosionAxis: null,
      parts: [
        {
          id: "part-010",
          label: "Housing",
          parentPartId: null,
          material: "Cast 316 stainless, machined bore",
          manufacturingMethod: "cast",
          explosionDirection: [0, -1, 0],
          explosionDistanceMm: 220,
          layerIndex: null,
          stressRating: 0.3,
          calloutText: "All four tolerances from the title live on this part.",
          model: { url: `${PUMP_PART_MODEL_DIRECTORY}/housing.glb`, byteSize: 48608 },
          placement: null,
        },
        {
          id: "part-011",
          label: "Drive shaft",
          parentPartId: null,
          material: "17-4 PH stainless, ground",
          manufacturingMethod: "cnc_milled",
          // Pinned upward: the shaft and the housing are coaxial, so an auto direction from the
          // assembly centre would send both the same way and never separate them.
          explosionDirection: [0, 1, 0],
          explosionDistanceMm: null,
          layerIndex: null,
          stressRating: 0.6,
          calloutText: null,
          model: { url: `${PUMP_PART_MODEL_DIRECTORY}/shaft.glb`, byteSize: 12640 },
          placement: null,
        },
        {
          id: "part-012",
          label: "Impeller",
          parentPartId: "part-011",
          material: "Cast bronze, CC480K",
          manufacturingMethod: "cast",
          // Far enough to clear the dropped housing rather than end up inside it: it rides the
          // shaft 140 mm up first, then drops 420 of its own.
          explosionDirection: [0, -1, 0],
          explosionDistanceMm: 420,
          layerIndex: null,
          stressRating: 0.45,
          calloutText: "Silt wear shows here first.",
          model: { url: `${PUMP_PART_MODEL_DIRECTORY}/impeller.glb`, byteSize: 34636 },
          placement: null,
        },
        {
          id: "part-013",
          label: "Seal carrier",
          parentPartId: "part-011",
          material: "PETG, printed in place of the machined carrier",
          manufacturingMethod: "fdm_printed",
          explosionDirection: null,
          explosionDistanceMm: null,
          layerIndex: null,
          stressRating: null,
          calloutText: "Printed to prove the fit before committing to the machined part.",
          model: { url: `${PUMP_PART_MODEL_DIRECTORY}/seal_carrier.glb`, byteSize: 17328 },
          placement: { positionMm: [0, 140, 0], rotationDegrees: [0, 0, 0] },
        },
        {
          id: "part-014",
          label: "Upper bearing",
          parentPartId: "part-011",
          material: "6203-2RS",
          manufacturingMethod: "off_the_shelf",
          explosionDirection: null,
          explosionDistanceMm: null,
          layerIndex: null,
          stressRating: 0.7,
          calloutText: null,
          model: { url: `${PUMP_PART_MODEL_DIRECTORY}/bearing_upper.glb`, byteSize: 32120 },
          placement: null,
        },
        {
          id: "part-015",
          label: "Lower bearing",
          parentPartId: "part-011",
          material: "6203-2RS",
          manufacturingMethod: "off_the_shelf",
          explosionDirection: [0, -1, 0],
          explosionDistanceMm: 40,
          layerIndex: null,
          stressRating: 0.75,
          calloutText: "The one that failed — the silt pattern is in the assembly guide.",
          model: { url: `${PUMP_PART_MODEL_DIRECTORY}/bearing_lower.glb`, byteSize: 32124 },
          placement: null,
        },
      ],
    },
    fasteners: [],
    manufacturingFiles: [],
    assemblySteps: [],
    repairabilityIndex: null,
    simulationTelemetry: {
      factorOfSafety: 1.6,
      peakVonMisesStressMegapascals: 118,
      maxDisplacementMicrometres: 42,
      thermalDeltaKelvin: 6.5,
      ratedLoadNewtons: 3200,
      source: "author_reported",
    },
  },
  {
    id: "bp-005",
    slug: "battery-management-system-teardown",
    title: "A 7S BMS teardown, cell by cell",
    category: "teardown",
    summary:
      "Balancing topology, the MOSFET selection nobody explains, and a measured comparison of the protection thresholds against what the datasheet claims.",
    thumbnailUrl: "/dummy/thumbnail_image05.avif",
    author: {
      displayName: "Tobias Lindqvist",
      handle: "tobias-cells",
      avatarUrl: "/dummy/profile_image_05.avif",
    },
    viewCount: 62190,
    likeCount: 5471,
    difficulty: "advanced",
    cadFormat: "Altium / STEP",
    billOfMaterialsCostRange: {
      minimumInCents: 2900,
      maximumInCents: 3800,
      currency: UNITED_STATES_DOLLAR,
    },
    tags: ["batteries", "bms", "safety", "power-electronics"],
    createdAt: "2026-07-11T14:33:00.000Z",
    walkthroughVideo: placeholderVideo("/dummy/thumbnail_image05.avif"),
    documents: [
      PLACEHOLDER_DOCUMENTS.batteryManagementSchematic,
      PLACEHOLDER_DOCUMENTS.batteryManagementBillOfMaterials,
    ],
    partCount: 91,
    assembly: null,
    fasteners: [],
    manufacturingFiles: [],
    // ⚠️ HOSTED WALKTHROUGH + TIMESTAMPS + NO ASSEMBLY, WHICH IS THE ONLY FIXTURE FOR THAT CASE.
    // `bp-001` covers the seek from inside the viewer's Exploded tab; this one covers it from the
    // step list rendered standalone on the page, which is a different mount path with a different
    // parent. `bp-003` used to cover it and cannot any more — its walkthrough is on YouTube, and a
    // YouTube walkthrough carries no step timestamps. Delete these steps and that path goes
    // unexercised.
    //
    // Every timestamp sits inside the ten-second placeholder clip, because the contract checks it.
    // `focusedPartId` is null throughout: there is no assembly to focus into.
    assemblySteps: [
      {
        stepNumber: 1,
        title: "Get the pack off the bench safely",
        description:
          "Seven cells in series is 29 V at the connector and no interlock anywhere. What to discharge, what to tape, and the one probe placement that shorts a balance lead.",
        timestampSeconds: 0,
        focusedPartId: null,
      },
      {
        stepNumber: 2,
        title: "Read the balancing topology off the board",
        description:
          "Passive bleed resistors beside each cell tap, and how to tell them from the sense divider they sit next to.",
        timestampSeconds: 4,
        focusedPartId: null,
      },
      {
        stepNumber: 3,
        title: "Measure the protection thresholds",
        description:
          "Over-voltage, under-voltage and the delay on each, against what the datasheet claims. Two of the three are off.",
        timestampSeconds: 8,
        focusedPartId: null,
      },
    ],
    repairabilityIndex: null,
    simulationTelemetry: null,
  },
  {
    id: "bp-006",
    slug: "low-cost-spectrometer-optical-path",
    title: "Folding a spectrometer's optical path into 60 mm",
    category: "teardown",
    summary:
      "The grating mount, the slit, and the printed baffle that took stray light from unusable to tolerable. Includes the alignment jig.",
    thumbnailUrl: "/dummy/thumbnail_image06.avif",
    author: {
      displayName: "Priya Raghavan",
      handle: "priya-optics",
      avatarUrl: "/dummy/profile_image_06.avif",
    },
    viewCount: 19870,
    likeCount: 1642,
    difficulty: "advanced",
    cadFormat: "STEP / FreeCAD",
    billOfMaterialsCostRange: {
      minimumInCents: 7200,
      maximumInCents: 9900,
      currency: UNITED_STATES_DOLLAR,
    },
    tags: ["optics", "instrumentation", "3d-printing"],
    createdAt: "2026-06-30T10:15:00.000Z",
    walkthroughVideo: null,
    documents: [],
    partCount: 19,
    assembly: null,
    fasteners: [],
    manufacturingFiles: [],
    assemblySteps: [],
    repairabilityIndex: null,
    simulationTelemetry: null,
  },
  {
    id: "bp-007",
    slug: "esp32-sensor-node-power-budget",
    title: "An ESP32 sensor node that lasts a year on two AAs",
    category: "teardown",
    summary:
      "Measured current in every state, the regulator swap that mattered more than the firmware, and the deep-sleep figure the datasheet does not give you.",
    thumbnailUrl: "/dummy/thumbnail_image07.avif",
    author: {
      displayName: "Marco Ferreira",
      handle: "marco-lowpower",
      avatarUrl: "/dummy/profile_image_07.avif",
    },
    viewCount: 74920,
    likeCount: 6903,
    difficulty: "beginner",
    cadFormat: "KiCad 8",
    billOfMaterialsCostRange: {
      minimumInCents: 620,
      maximumInCents: 940,
      currency: UNITED_STATES_DOLLAR,
    },
    tags: ["iot", "low-power", "esp32", "firmware"],
    createdAt: "2026-06-21T07:48:00.000Z",
    walkthroughVideo: null,
    documents: [PLACEHOLDER_DOCUMENTS.sensorNodeDatasheet],
    partCount: 31,
    assembly: null,
    fasteners: [],
    manufacturingFiles: [],
    assemblySteps: [],
    repairabilityIndex: null,
    simulationTelemetry: null,
  },
  {
    id: "bp-008",
    slug: "milk-chiller-heat-exchanger-teardown",
    title: "Heat exchanger from a dairy chiller, cut in half",
    category: "teardown",
    summary:
      "Plate spacing, braze quality and the fouling pattern after eighteen months in service — with the pressure-drop measurements that explain the pump sizing.",
    thumbnailUrl: "/dummy/thumbnail_image08.avif",
    author: {
      displayName: "Fatima Al-Rashid",
      handle: "fatima-thermal",
      avatarUrl: "/dummy/profile_image_08.avif",
    },
    viewCount: 21460,
    likeCount: 1477,
    difficulty: "intermediate",
    cadFormat: "STEP",
    billOfMaterialsCostRange: {
      minimumInCents: 34000,
      maximumInCents: 41000,
      currency: UNITED_STATES_DOLLAR,
    },
    tags: ["cold-chain", "thermal", "dairy", "maintenance"],
    createdAt: "2026-06-09T13:57:00.000Z",
    walkthroughVideo: null,
    documents: [PLACEHOLDER_DOCUMENTS.heatExchangerSchematic],
    partCount: 8,
    assembly: null,
    fasteners: [],
    manufacturingFiles: [],
    assemblySteps: [],
    repairabilityIndex: null,
    simulationTelemetry: null,
  },
  {
    id: "bp-013",
    slug: "hand-pump-gearbox-teardown",
    title: "The gearbox in a village hand pump, after nine years",
    category: "teardown",
    summary:
      "Wear patterns on a cast bronze worm drive that outlived its rated life by six years, and the two bearings that did not.",
    thumbnailUrl: "/dummy/thumbnail_image09.avif",
    author: {
      displayName: "Grace Wanjiru",
      handle: "grace-mech",
      avatarUrl: "/dummy/profile_image_04.avif",
    },
    viewCount: 15230,
    likeCount: 1204,
    difficulty: "beginner",
    cadFormat: "STEP",
    billOfMaterialsCostRange: {
      minimumInCents: 8800,
      maximumInCents: 11200,
      currency: UNITED_STATES_DOLLAR,
    },
    tags: ["water", "mechanical", "wear", "maintenance"],
    createdAt: "2026-08-06T10:30:00.000Z",
    walkthroughVideo: null,
    documents: [],
    partCount: 17,
    assembly: null,
    fasteners: [],
    manufacturingFiles: [],
    assemblySteps: [],
    repairabilityIndex: null,
    simulationTelemetry: null,
  },
  {
    id: "bp-014",
    slug: "grain-moisture-meter-teardown",
    title: "A grain moisture meter and the capacitance bridge inside it",
    category: "teardown",
    summary:
      "Why the calibration is per-crop rather than universal, where the temperature compensation happens, and the op-amp choice that sets the whole error budget.",
    thumbnailUrl: "/dummy/thumbnail_image10.avif",
    author: {
      displayName: "Rahul Mehta",
      handle: "rahul-teardown",
      avatarUrl: "/dummy/profile_image_02.avif",
    },
    viewCount: 28940,
    likeCount: 2317,
    difficulty: "intermediate",
    cadFormat: "KiCad 8",
    billOfMaterialsCostRange: {
      minimumInCents: 2100,
      maximumInCents: 3300,
      currency: UNITED_STATES_DOLLAR,
    },
    tags: ["agriculture", "instrumentation", "analog", "sensors"],
    createdAt: "2026-07-16T09:05:00.000Z",
    walkthroughVideo: placeholderVideo("/dummy/thumbnail_image10.avif"),
    documents: [],
    partCount: 44,
    assembly: null,
    fasteners: [],
    manufacturingFiles: [],
    assemblySteps: [],
    repairabilityIndex: null,
    simulationTelemetry: null,
  },
  {
    id: "bp-015",
    slug: "off-grid-router-power-rail-teardown",
    title: "The power rail in an off-grid mesh router",
    category: "teardown",
    summary:
      "Three buck stages, one of them doing nothing useful, and the brownout behaviour that explains a year of unexplained reboots in the field.",
    thumbnailUrl: "/dummy/thumbnail_image11.avif",
    author: {
      displayName: "Marco Ferreira",
      handle: "marco-lowpower",
      avatarUrl: "/dummy/profile_image_07.avif",
    },
    viewCount: 41870,
    likeCount: 3925,
    difficulty: "advanced",
    cadFormat: "Altium",
    billOfMaterialsCostRange: {
      minimumInCents: 1450,
      maximumInCents: 2050,
      currency: UNITED_STATES_DOLLAR,
    },
    tags: ["networking", "power-electronics", "reliability", "off-grid"],
    createdAt: "2026-07-03T14:12:00.000Z",
    walkthroughVideo: null,
    documents: [],
    partCount: 77,
    assembly: null,
    fasteners: [],
    manufacturingFiles: [],
    assemblySteps: [],
    repairabilityIndex: null,
    simulationTelemetry: null,
  },
  {
    id: "bp-016",
    slug: "irrigation-valve-actuator-teardown",
    title: "A latching irrigation valve that runs on one coin cell a season",
    category: "teardown",
    summary:
      "The latching solenoid, the drive pulse it actually needs versus the one the controller sends, and where the remaining energy goes.",
    thumbnailUrl: "/dummy/thumbnail_image12.avif",
    author: {
      displayName: "Fatima Al-Rashid",
      handle: "fatima-thermal",
      avatarUrl: "/dummy/profile_image_08.avif",
    },
    viewCount: 12680,
    likeCount: 989,
    difficulty: "beginner",
    cadFormat: null,
    billOfMaterialsCostRange: {
      minimumInCents: 1900,
      maximumInCents: 2600,
      currency: UNITED_STATES_DOLLAR,
    },
    tags: ["agriculture", "low-power", "actuators", "water"],
    createdAt: "2026-06-14T11:44:00.000Z",
    walkthroughVideo: null,
    documents: [],
    partCount: null,
    assembly: null,
    fasteners: [],
    manufacturingFiles: [],
    assemblySteps: [],
    repairabilityIndex: null,
    simulationTelemetry: null,
  },
  {
    id: "bp-009",
    slug: "solar-cold-storage-field-prototype",
    title: "Solar cold store running for 90 days in Nakuru",
    category: "showcase",
    summary:
      "The controller from the first teardown, built into a working 400 L unit and left in a market for three months. Temperature logs, two failures, one fix.",
    thumbnailUrl: "/dummy/placeholder-freezers.avif",
    author: {
      displayName: "Amara Okonkwo",
      handle: "amara-builds",
      avatarUrl: "/dummy/profile_image_01.avif",
    },
    viewCount: 58330,
    likeCount: 6218,
    difficulty: "advanced",
    cadFormat: "STEP / Fusion 360",
    billOfMaterialsCostRange: {
      minimumInCents: 82000,
      maximumInCents: 96000,
      currency: UNITED_STATES_DOLLAR,
    },
    tags: ["cold-chain", "solar", "field-trial", "east-africa"],
    createdAt: "2026-08-30T12:00:00.000Z",
    tagline: "Holds 4 °C for 62 hours with no sun, in 41 °C ambient",
    launchedAt: "2026-09-01T08:00:00.000Z",
    upvoteCount: 214,
    team: [
      {
        displayName: "Amara Okonkwo",
        handle: "amara-builds",
        avatarUrl: "/dummy/profile_image_01.avif",
        role: "Electronics",
      },
      {
        displayName: "Grace Wanjiru",
        handle: "grace-mech",
        avatarUrl: "/dummy/profile_image_04.avif",
        role: "Mechanical",
      },
    ],
    builtFromBlueprintSlug: "solar-cold-storage-controller-teardown",
    demoVideo: placeholderVideo("/dummy/placeholder-freezers.avif", PLACEHOLDER_CAPTIONS_URL),
    callToAction: {
      label: "Read the 90-day field log",
      url: "https://example.com/qatoto/nakuru-field-log",
    },
  },
  {
    id: "bp-010",
    slug: "handheld-soil-analyser-prototype",
    title: "Handheld soil analyser, third prototype",
    category: "showcase",
    summary:
      "The folded spectrometer in an enclosure a field agent can hold, with the calibration workflow and the readings compared against a lab reference.",
    thumbnailUrl: "/dummy/placeholder-instruments.avif",
    author: {
      displayName: "Priya Raghavan",
      handle: "priya-optics",
      avatarUrl: "/dummy/profile_image_06.avif",
    },
    viewCount: 36105,
    likeCount: 3390,
    difficulty: "advanced",
    cadFormat: "STEP / FreeCAD",
    billOfMaterialsCostRange: {
      minimumInCents: 14500,
      maximumInCents: 18000,
      currency: UNITED_STATES_DOLLAR,
    },
    tags: ["agriculture", "optics", "instrumentation", "prototype"],
    createdAt: "2026-08-27T15:26:00.000Z",
    tagline: "Nitrogen and organic carbon in 40 seconds, without a lab",
    launchedAt: "2026-08-28T09:30:00.000Z",
    upvoteCount: 147,
    team: [
      {
        displayName: "Priya Raghavan",
        handle: "priya-optics",
        avatarUrl: "/dummy/profile_image_06.avif",
        role: "Optics and firmware",
      },
    ],
    builtFromBlueprintSlug: "low-cost-spectrometer-optical-path",
    demoVideo: null,
    callToAction: null,
  },
  {
    id: "bp-017",
    slug: "brushless-cargo-trike-drivetrain",
    title: "Cargo trike drivetrain on the Lagos-sourced driver",
    category: "showcase",
    summary:
      "Two of the 15 A drivers in a 300 kg cargo trike, six months of delivery rounds, and the thermal derating that ended up mattering more than peak torque.",
    thumbnailUrl: "/dummy/thumbnail_image03.avif",
    author: {
      displayName: "Chidi Eze",
      handle: "chidi-motors",
      avatarUrl: "/dummy/profile_image_03.avif",
    },
    viewCount: 44210,
    likeCount: 4103,
    difficulty: "intermediate",
    cadFormat: "STEP",
    billOfMaterialsCostRange: {
      minimumInCents: 61000,
      maximumInCents: 74000,
      currency: UNITED_STATES_DOLLAR,
    },
    tags: ["mobility", "motors", "logistics", "west-africa"],
    createdAt: "2026-09-04T10:10:00.000Z",
    tagline: "300 kg up a 9% grade, on parts you can buy in Ikeja",
    launchedAt: "2026-09-05T07:15:00.000Z",
    upvoteCount: 302,
    team: [
      {
        displayName: "Chidi Eze",
        handle: "chidi-motors",
        avatarUrl: "/dummy/profile_image_03.avif",
        role: "Drivetrain",
      },
      {
        displayName: "Tobias Lindqvist",
        handle: "tobias-cells",
        avatarUrl: "/dummy/profile_image_05.avif",
        role: "Pack and BMS",
      },
      {
        displayName: "Marco Ferreira",
        handle: "marco-lowpower",
        avatarUrl: "/dummy/profile_image_07.avif",
        role: "Telemetry",
      },
    ],
    builtFromBlueprintSlug: "brushless-motor-driver-schematic",
    demoVideo: placeholderVideo("/dummy/thumbnail_image03.avif"),
    callToAction: {
      label: "Route and load data",
      url: "https://example.com/qatoto/cargo-trike-routes",
    },
  },
  {
    id: "bp-018",
    slug: "grain-moisture-meter-field-units",
    title: "Forty moisture meters, one harvest season",
    category: "showcase",
    summary:
      "The capacitance bridge rebuilt as a field unit and handed to forty co-op buyers. What broke, what they ignored, and the one reading they did not trust.",
    thumbnailUrl: "/dummy/thumbnail_image10.avif",
    author: {
      displayName: "Rahul Mehta",
      handle: "rahul-teardown",
      avatarUrl: "/dummy/profile_image_02.avif",
    },
    viewCount: 22870,
    likeCount: 2011,
    difficulty: "intermediate",
    cadFormat: "KiCad 8 / STEP",
    billOfMaterialsCostRange: {
      minimumInCents: 3900,
      maximumInCents: 5200,
      currency: UNITED_STATES_DOLLAR,
    },
    tags: ["agriculture", "instrumentation", "field-trial"],
    createdAt: "2026-08-22T13:40:00.000Z",
    tagline: "Within 0.4% of the lab, in a shed, on a phone charger",
    launchedAt: "2026-08-24T06:45:00.000Z",
    upvoteCount: 96,
    team: [
      {
        displayName: "Rahul Mehta",
        handle: "rahul-teardown",
        avatarUrl: "/dummy/profile_image_02.avif",
        role: "Hardware",
      },
      {
        displayName: "Priya Raghavan",
        handle: "priya-optics",
        avatarUrl: "/dummy/profile_image_06.avif",
        role: "Calibration",
      },
    ],
    builtFromBlueprintSlug: "grain-moisture-meter-teardown",
    demoVideo: null,
    callToAction: null,
  },
  {
    id: "bp-019",
    slug: "dairy-chiller-retrofit-pilot",
    title: "Retrofitting eleven dairy chillers instead of replacing them",
    category: "showcase",
    summary:
      "A controller and sensor kit fitted to chillers already in service at eleven collection points, and the energy figures before and after.",
    thumbnailUrl: "/dummy/placeholder-compressors.avif",
    author: {
      displayName: "Fatima Al-Rashid",
      handle: "fatima-thermal",
      avatarUrl: "/dummy/profile_image_08.avif",
    },
    viewCount: 18340,
    likeCount: 1522,
    difficulty: "beginner",
    cadFormat: null,
    billOfMaterialsCostRange: {
      minimumInCents: 21000,
      maximumInCents: 27500,
      currency: UNITED_STATES_DOLLAR,
    },
    tags: ["cold-chain", "dairy", "retrofit", "energy"],
    createdAt: "2026-08-17T08:55:00.000Z",
    tagline: "23% less energy per litre, without buying a single new chiller",
    launchedAt: "2026-08-19T11:20:00.000Z",
    upvoteCount: 58,
    team: [
      {
        displayName: "Fatima Al-Rashid",
        handle: "fatima-thermal",
        avatarUrl: "/dummy/profile_image_08.avif",
        role: "Thermal",
      },
    ],
    // Built from equipment that was never published here as a teardown.
    builtFromBlueprintSlug: null,
    demoVideo: null,
    callToAction: {
      label: "Site-by-site energy figures",
      url: "https://example.com/qatoto/chiller-retrofit-energy",
    },
  },
  {
    id: "bp-023",
    slug: "latching-valve-drip-irrigation-pilot",
    title: "Sixty latching valves on a two-hectare drip scheme in Kisumu",
    category: "showcase",
    summary:
      "The latching actuator from the teardown fitted to sixty valves on a drip scheme and run on a schedule from one node for a growing season. Which valves stuck, why the schedule drifted, and the coin cells that did not last.",
    thumbnailUrl: "/dummy/thumbnail_image12.avif",
    author: {
      displayName: "Naledi Dlamini",
      handle: "naledi-agri",
      avatarUrl: "/dummy/profile_image_09.avif",
    },
    viewCount: 27410,
    likeCount: 2488,
    difficulty: "intermediate",
    cadFormat: "STEP / FreeCAD",
    billOfMaterialsCostRange: {
      minimumInCents: 4800,
      maximumInCents: 6100,
      currency: UNITED_STATES_DOLLAR,
    },
    tags: ["agriculture", "water", "actuators", "field-trial", "east-africa"],
    createdAt: "2026-09-01T15:45:00.000Z",
    tagline: "One coin cell per valve, a full season, zero mains",
    launchedAt: "2026-09-03T08:00:00.000Z",
    upvoteCount: 129,
    team: [
      {
        displayName: "Naledi Dlamini",
        handle: "naledi-agri",
        avatarUrl: "/dummy/profile_image_09.avif",
        role: "Field deployment",
      },
      {
        displayName: "Fatima Al-Rashid",
        handle: "fatima-thermal",
        avatarUrl: "/dummy/profile_image_08.avif",
        role: "Actuator firmware",
      },
    ],
    builtFromBlueprintSlug: "irrigation-valve-actuator-teardown",
    demoVideo: placeholderVideo("/dummy/thumbnail_image12.avif"),
    callToAction: {
      label: "Watering schedule and soil logs",
      url: "https://example.com/qatoto/kisumu-drip-logs",
    },
  },
  {
    id: "bp-024",
    slug: "seven-cell-pack-for-motorcycle-taxis",
    title: "A 7S pack that survived 400 charge cycles on Kampala boda-bodas",
    category: "showcase",
    summary:
      "The balancing and protection board from the BMS teardown built into a swappable pack and run by six motorcycle taxis for five months. Cycle-by-cycle capacity, the two cells that were replaced, and the connector that wore first.",
    thumbnailUrl: "/dummy/thumbnail_image05.avif",
    author: {
      displayName: "Tobias Lindqvist",
      handle: "tobias-cells",
      avatarUrl: "/dummy/profile_image_05.avif",
    },
    viewCount: 51280,
    likeCount: 5476,
    difficulty: "advanced",
    cadFormat: "STEP",
    billOfMaterialsCostRange: {
      minimumInCents: 38000,
      maximumInCents: 46000,
      currency: UNITED_STATES_DOLLAR,
    },
    tags: ["mobility", "batteries", "energy", "east-africa"],
    createdAt: "2026-08-28T16:05:00.000Z",
    tagline: "Swappable 1.2 kWh, 400 cycles, 91% capacity left",
    launchedAt: "2026-08-30T09:30:00.000Z",
    upvoteCount: 263,
    team: [
      {
        displayName: "Tobias Lindqvist",
        handle: "tobias-cells",
        avatarUrl: "/dummy/profile_image_05.avif",
        role: "Pack and BMS",
      },
      {
        displayName: "Chidi Eze",
        handle: "chidi-motors",
        avatarUrl: "/dummy/profile_image_03.avif",
        role: "Motor integration",
      },
      {
        displayName: "Wanjiku Kamau",
        handle: "wanjiku-power",
        avatarUrl: "/dummy/profile_image_10.avif",
        role: "Field data",
      },
    ],
    builtFromBlueprintSlug: "battery-management-system-teardown",
    demoVideo: null,
    callToAction: {
      label: "Cycle-by-cycle capacity data",
      url: "https://example.com/qatoto/boda-pack-cycles",
    },
  },
  {
    id: "bp-025",
    slug: "hand-pump-gearbox-replacement-kit",
    title: "A drop-in gearbox kit for the village hand pump, fitted at twelve wells",
    category: "showcase",
    summary:
      "The worn gear train from the teardown redesigned as a kit that drops into the existing casting, and fitted at twelve wells by the county maintenance crew. Fit times, the one casting it did not fit, and what the crew changed.",
    thumbnailUrl: "/dummy/thumbnail_image09.avif",
    author: {
      displayName: "Grace Wanjiru",
      handle: "grace-mech",
      avatarUrl: "/dummy/profile_image_04.avif",
    },
    viewCount: 15920,
    likeCount: 1364,
    difficulty: "beginner",
    cadFormat: "STEP / Fusion 360",
    billOfMaterialsCostRange: {
      minimumInCents: 6500,
      maximumInCents: 8200,
      currency: UNITED_STATES_DOLLAR,
    },
    tags: ["water", "mechanical", "retrofit", "east-africa"],
    createdAt: "2026-08-24T13:30:00.000Z",
    tagline: "Fitted in 40 minutes with the tools already on the truck",
    launchedAt: "2026-08-26T07:00:00.000Z",
    // Deliberately ties `grain-moisture-meter-field-units` at 96, so `byMostUpvoted`'s tie-break is
    // exercised on the second page of `?sort=top` rather than only in a comment.
    upvoteCount: 96,
    team: [
      {
        displayName: "Grace Wanjiru",
        handle: "grace-mech",
        avatarUrl: "/dummy/profile_image_04.avif",
        role: "Mechanical",
      },
    ],
    builtFromBlueprintSlug: "hand-pump-gearbox-teardown",
    demoVideo: null,
    callToAction: null,
  },
  {
    id: "bp-026",
    slug: "machined-borehole-pump-housings-dry-season",
    title: "Twenty borehole pumps on a machined housing, one dry season",
    category: "showcase",
    summary:
      "Housings machined to the four tolerances from the teardown, fitted to twenty pumps across two counties and inspected monthly through a dry season. Seal condition per well, the two housings re-machined, and the tolerance that turned out to be loose.",
    thumbnailUrl: "/dummy/thumbnail_image04.avif",
    author: {
      displayName: "Kwame Mensah",
      handle: "kwame-machining",
      avatarUrl: "/dummy/profile_image_11.avif",
    },
    viewCount: 33640,
    likeCount: 3012,
    difficulty: "intermediate",
    cadFormat: "STEP",
    billOfMaterialsCostRange: {
      minimumInCents: 18500,
      maximumInCents: 23000,
      currency: UNITED_STATES_DOLLAR,
    },
    tags: ["water", "machining", "field-trial", "west-africa"],
    createdAt: "2026-08-20T09:50:00.000Z",
    tagline: "Zero seal failures across 20 wells and 3,100 pump-hours",
    launchedAt: "2026-08-21T10:10:00.000Z",
    upvoteCount: 188,
    team: [
      {
        displayName: "Kwame Mensah",
        handle: "kwame-machining",
        avatarUrl: "/dummy/profile_image_11.avif",
        role: "Machining",
      },
      {
        displayName: "Grace Wanjiru",
        handle: "grace-mech",
        avatarUrl: "/dummy/profile_image_04.avif",
        role: "Tolerances",
      },
    ],
    builtFromBlueprintSlug: "borehole-pump-housing-tolerances",
    demoVideo: placeholderVideo("/dummy/thumbnail_image04.avif"),
    callToAction: {
      label: "Pump-hour and seal inspection log",
      url: "https://example.com/qatoto/borehole-seal-log",
    },
  },
  {
    id: "bp-027",
    slug: "off-grid-mesh-nodes-kumasi-market",
    title: "Fourteen mesh nodes across a Kumasi market, running on the rebuilt rail",
    category: "showcase",
    summary:
      "The power rail from the router teardown rebuilt with the panel and cell it should have shipped with, in fourteen nodes strung across a covered market. Uptime per node, the two that browned out in the first week, and the fix.",
    thumbnailUrl: "/dummy/thumbnail_image11.avif",
    author: {
      displayName: "Marco Ferreira",
      handle: "marco-lowpower",
      avatarUrl: "/dummy/profile_image_07.avif",
    },
    viewCount: 8930,
    likeCount: 742,
    difficulty: "intermediate",
    cadFormat: null,
    billOfMaterialsCostRange: {
      minimumInCents: 9800,
      maximumInCents: 12400,
      currency: UNITED_STATES_DOLLAR,
    },
    tags: ["connectivity", "low-power", "solar", "west-africa"],
    createdAt: "2026-09-05T14:20:00.000Z",
    tagline: "Fourteen nodes, 31 days, no mains and no reboot",
    launchedAt: "2026-09-07T06:30:00.000Z",
    upvoteCount: 41,
    team: [
      {
        displayName: "Marco Ferreira",
        handle: "marco-lowpower",
        avatarUrl: "/dummy/profile_image_07.avif",
        role: "Power",
      },
      {
        displayName: "Adaeze Nwosu",
        handle: "adaeze-networks",
        avatarUrl: "/dummy/profile_image_12.avif",
        role: "Network",
      },
    ],
    builtFromBlueprintSlug: "off-grid-router-power-rail-teardown",
    demoVideo: null,
    callToAction: null,
  },
  {
    id: "bp-012",
    slug: "sensor-node-first-thousand-units",
    title: "The first thousand sensor nodes: what the unit economics did",
    category: "case_study",
    summary:
      "Cost per node across four production runs, where the curve flattened, and the assembly step that turned out to dominate everything else.",
    thumbnailUrl: "/dummy/thumbnail_image07.avif",
    author: {
      displayName: "Marco Ferreira",
      handle: "marco-lowpower",
      avatarUrl: "/dummy/profile_image_07.avif",
    },
    viewCount: 51240,
    likeCount: 4863,
    difficulty: "beginner",
    cadFormat: null,
    billOfMaterialsCostRange: {
      minimumInCents: 480,
      maximumInCents: 940,
      currency: UNITED_STATES_DOLLAR,
    },
    tags: ["manufacturing", "unit-economics", "iot", "scaling"],
    createdAt: "2026-08-27T11:18:00.000Z",
    conceptNumber: 1,
    discipline: "unit_economics",
    oneLineDefinition:
      "Per-unit cost stops falling long before volume does; find the step that has stopped scaling.",
    takeaways: [
      "Cost per node fell 41% between run one and run three, then 3% between run three and run four.",
      "Hand-placed connectors were 38% of assembly time at every volume — the step that never scaled.",
      "The cheapest BOM was not the cheapest unit: the low-cost regulator added a test step.",
    ],
    outcomeMetrics: [
      { label: "Units shipped", value: { kind: "count", amount: 1000 } },
      {
        label: "Cost per unit, run 4",
        value: { kind: "money", amountInCents: 512, currency: UNITED_STATES_DOLLAR },
      },
      { label: "Cost reduction, runs 1-4", value: { kind: "percentage", basisPoints: 4380 } },
    ],
    furtherReading: [
      {
        label: "Run-by-run cost breakdown",
        url: "https://example.com/qatoto/sensor-node-cost-runs",
      },
    ],
  },
  {
    id: "bp-011",
    slug: "nairobi-injection-molding-case-study",
    title: "Moving a moulded enclosure from Shenzhen to Nairobi",
    category: "case_study",
    summary:
      "What changed when the tool moved: lead time, scrap rate, per-unit cost, and the two design edits the local moulder needed before quoting.",
    thumbnailUrl: "/dummy/placeholder-cartons.avif",
    author: {
      displayName: "Grace Wanjiru",
      handle: "grace-mech",
      avatarUrl: "/dummy/profile_image_04.avif",
    },
    viewCount: 44780,
    likeCount: 4102,
    difficulty: "intermediate",
    cadFormat: null,
    billOfMaterialsCostRange: null,
    tags: ["injection-molding", "manufacturing", "east-africa", "unit-economics"],
    createdAt: "2026-07-25T09:40:00.000Z",
    conceptNumber: 2,
    discipline: "tooling",
    oneLineDefinition:
      "A tool is designed for one moulder's machine; moving it is a redesign, not a shipment.",
    takeaways: [
      "Two draft-angle edits were needed before any local moulder would quote the part.",
      "Lead time fell from 34 days to 9; per-unit cost rose 12% and was still the better trade.",
      "The tool survived the move; the gate design did not, and was recut locally.",
    ],
    outcomeMetrics: [
      { label: "Lead time, after", value: { kind: "count", amount: 9 } },
      { label: "Per-unit cost change", value: { kind: "percentage", basisPoints: 1200 } },
      {
        label: "Recut tooling cost",
        value: { kind: "money", amountInCents: 940000, currency: UNITED_STATES_DOLLAR },
      },
    ],
    furtherReading: [
      {
        label: "The two design edits, in CAD",
        url: "https://example.com/qatoto/draft-angle-edits",
      },
      { label: "Quote comparison sheet", url: "https://example.com/qatoto/moulder-quotes" },
    ],
  },
  {
    id: "bp-020",
    slug: "contract-assembly-switch-case-study",
    title: "Switching contract assemblers mid-run",
    category: "case_study",
    summary:
      "Six weeks of overlap between two assemblers, what the handover documentation missed, and the yield gap that closed only after a site visit.",
    thumbnailUrl: "/dummy/thumbnail_image11.avif",
    author: {
      displayName: "Tobias Lindqvist",
      handle: "tobias-cells",
      avatarUrl: "/dummy/profile_image_05.avif",
    },
    viewCount: 29410,
    likeCount: 2604,
    difficulty: "intermediate",
    cadFormat: null,
    billOfMaterialsCostRange: null,
    tags: ["manufacturing", "supply-chain", "assembly", "quality"],
    createdAt: "2026-08-11T10:05:00.000Z",
    conceptNumber: 3,
    discipline: "supply_chain",
    oneLineDefinition:
      "The knowledge that makes a line work is not in the documentation the line hands over.",
    takeaways: [
      "First-pass yield at the new assembler was 71% against 94%, on identical documentation.",
      "The gap closed in one site visit: a reflow profile nobody had written down.",
      "Six weeks of overlap cost less than one week of a stopped line would have.",
    ],
    outcomeMetrics: [
      { label: "First-pass yield, week 1", value: { kind: "percentage", basisPoints: 7100 } },
      { label: "First-pass yield, week 8", value: { kind: "percentage", basisPoints: 9550 } },
      { label: "Overlap period, weeks", value: { kind: "count", amount: 6 } },
    ],
    furtherReading: [
      {
        label: "Handover checklist we now use",
        url: "https://example.com/qatoto/handover-checklist",
      },
    ],
  },
  {
    id: "bp-021",
    slug: "chiller-warranty-returns-case-study",
    title: "What eleven warranty returns actually told us",
    category: "case_study",
    summary:
      "Every returned unit stripped and logged, the failure that accounted for eight of eleven, and the incoming-inspection step that would have caught it.",
    thumbnailUrl: "/dummy/placeholder-compressors.avif",
    author: {
      displayName: "Fatima Al-Rashid",
      handle: "fatima-thermal",
      avatarUrl: "/dummy/profile_image_08.avif",
    },
    viewCount: 17920,
    likeCount: 1688,
    difficulty: "advanced",
    cadFormat: null,
    billOfMaterialsCostRange: null,
    tags: ["quality", "warranty", "cold-chain", "failure-analysis"],
    createdAt: "2026-07-14T12:25:00.000Z",
    conceptNumber: 4,
    discipline: "quality",
    oneLineDefinition:
      "A return rate is a summary; the failure mode behind it is almost always a single supplier lot.",
    takeaways: [
      "Eight of eleven returns traced to one crimp tool out of calibration at the assembler.",
      "A 30-second pull test on incoming looms would have caught every one of them.",
      "Field failure clustered by build week, not by site or climate — which is how it was found.",
    ],
    outcomeMetrics: [
      { label: "Units returned", value: { kind: "count", amount: 11 } },
      { label: "Return rate, affected batch", value: { kind: "percentage", basisPoints: 340 } },
      {
        label: "Cost of the returns",
        value: { kind: "money", amountInCents: 1870000, currency: UNITED_STATES_DOLLAR },
      },
    ],
    furtherReading: [
      {
        label: "Failure analysis photographs",
        url: "https://example.com/qatoto/crimp-failure-log",
      },
    ],
  },
  {
    id: "bp-022",
    slug: "last-mile-cold-chain-distribution",
    title: "Getting cold boxes to 60 collection points without a depot",
    category: "case_study",
    summary:
      "Distribution built on existing dairy collection routes rather than a new network, the two weeks it did not work, and what the drivers changed.",
    thumbnailUrl: "/dummy/placeholder-cartons.avif",
    author: {
      displayName: "Amara Okonkwo",
      handle: "amara-builds",
      avatarUrl: "/dummy/profile_image_01.avif",
    },
    viewCount: 24560,
    likeCount: 2189,
    difficulty: "beginner",
    cadFormat: null,
    billOfMaterialsCostRange: null,
    tags: ["distribution", "logistics", "cold-chain", "east-africa"],
    createdAt: "2026-06-26T09:15:00.000Z",
    conceptNumber: 5,
    discipline: "distribution",
    oneLineDefinition:
      "The cheapest distribution network is usually one that already exists for something else.",
    takeaways: [
      "Riding on dairy collection routes cut delivery cost per unit by 64% against a courier.",
      "It failed for two weeks because the route ran at 05:00 and nobody was there to sign.",
      "Drivers redesigned the handover themselves once they were asked rather than instructed.",
    ],
    outcomeMetrics: [
      { label: "Collection points served", value: { kind: "count", amount: 60 } },
      {
        label: "Delivery cost per unit",
        value: { kind: "money", amountInCents: 210, currency: UNITED_STATES_DOLLAR },
      },
      { label: "Cost reduction vs courier", value: { kind: "percentage", basisPoints: 6400 } },
    ],
    furtherReading: [
      { label: "Route overlay map", url: "https://example.com/qatoto/dairy-route-overlay" },
    ],
  },
];
