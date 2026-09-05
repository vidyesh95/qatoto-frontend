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
// THE SPLIT HERE IS 12 / 5 / 5, NOT 70/20/10, and that is deliberate. The 70/20/10 ratio is a
// content target for REAL builds; applied to fixtures it gave two showcases and two case studies,
// and a launch feed of two rows or a numbered index of two cards does not exercise its own
// design — it reads as broken. The two small buckets are over-sampled so the layouts can be built
// against something that looks like use. There are exactly five case studies because there are
// five disciplines, and a discipline with no fixture is a card tint nobody ever sees.

import type { Blueprint, BlueprintDocument, BlueprintVideo } from "@/lib/blueprints/schemas";

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

function placeholderVideo(posterUrl: string): BlueprintVideo {
  return {
    url: PLACEHOLDER_VIDEO_URL,
    posterUrl,
    durationSeconds: PLACEHOLDER_VIDEO_DURATION_SECONDS,
    // Null throughout: nobody captioned a placeholder, and an absent track is the honest state.
    // The `<track>` branch is therefore unexercised — noted in `todo.md` against the media phase.
    captionsUrl: null,
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
 * Twenty-two builds across the three arms.
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
 * - `callToAction: null` and `demoVideo: null` on several showcases — most launches have neither.
 * - `partCount: null` where nobody counted. Not zero: a zero-part teardown is not a teardown.
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
    walkthroughVideo: placeholderVideo("/dummy/thumbnail_image01.avif"),
    documents: [PLACEHOLDER_DOCUMENTS.solarSchematic, PLACEHOLDER_DOCUMENTS.solarBillOfMaterials],
    partCount: 148,
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
    walkthroughVideo: placeholderVideo("/dummy/thumbnail_image03.avif"),
    documents: [PLACEHOLDER_DOCUMENTS.brushlessSchematic],
    partCount: 62,
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
    createdAt: "2026-08-20T12:00:00.000Z",
    tagline: "Holds 4 °C for 62 hours with no sun, in 41 °C ambient",
    launchedAt: "2026-08-22T08:00:00.000Z",
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
    demoVideo: placeholderVideo("/dummy/placeholder-freezers.avif"),
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
    createdAt: "2026-08-08T15:26:00.000Z",
    tagline: "Nitrogen and organic carbon in 40 seconds, without a lab",
    launchedAt: "2026-08-09T09:30:00.000Z",
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
    createdAt: "2026-08-25T10:10:00.000Z",
    tagline: "300 kg up a 9% grade, on parts you can buy in Ikeja",
    launchedAt: "2026-08-26T07:15:00.000Z",
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
    createdAt: "2026-07-30T13:40:00.000Z",
    tagline: "Within 0.4% of the lab, in a shed, on a phone charger",
    launchedAt: "2026-08-01T06:45:00.000Z",
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
    createdAt: "2026-07-06T08:55:00.000Z",
    tagline: "23% less energy per litre, without buying a single new chiller",
    launchedAt: "2026-07-08T11:20:00.000Z",
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
