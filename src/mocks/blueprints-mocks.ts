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

import type { Blueprint } from "@/lib/blueprints/schemas";

/** USD throughout; a real payload would carry the seller's own currency per row. */
const UNITED_STATES_DOLLAR = "USD";

/**
 * Twelve builds on the hub's 70/20/10 split — eight teardowns, two showcases, two case studies.
 *
 * Two rows carry `billOfMaterialsCostRange: null` on purpose (`thermal-camera-module-teardown`
 * and `nairobi-injection-molding-case-study`): an uncosted build is an ordinary state, and the
 * renderer must show an absence rather than a $0 band. If every fixture had a cost, that branch
 * would never render during development and would break the first time real data arrived.
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
  },
  {
    id: "bp-012",
    slug: "sensor-node-first-thousand-units",
    title: "The first thousand sensor nodes: what the unit economics did",
    category: "case_study",
    summary:
      "Cost per node across four production runs, where the curve flattened, and the assembly step that turned out to dominate everything else.",
    thumbnailUrl: "/dummy/placeholder-compressors.avif",
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
  },
];
