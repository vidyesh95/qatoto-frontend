# Civic Pulse: Problem Taxonomy Specification

> **Specification**: `docs/PROBLEM_TAXONOMY.md`  
> **Taxonomy Version**: `2026.1`  
> **Schema Authority**: `src/lib/rnd/discovery.schemas.ts`  
> **Parent Document**: [docs/CIVIC_PULSE_PROBLEM_MAPPING.md](./CIVIC_PULSE_PROBLEM_MAPPING.md)

---

> ## ⚠️ Correction header — read this before the document below
>
> **Status: PROPOSED, NOT IMPLEMENTED, and amended in three ways.** The shipped taxonomy is the
> flat, user-creatable, moderated `research_category` table with an 11-value `pinIconKey`. The
> corpus below is a **seed shape**, not a schema.
>
> - ⚠️ **THE HARDCODED UUIDs (`11000000-0000-…`) ARE REJECTED.** They are unmergeable and
>   unmigratable, and they make taxonomy identity depend on a wire-format detail. **Stable slugs
>   are the durable identifier** (`water.flooding`, `infrastructure.roads.potholes`); the database
>   generates the UUIDs and the API may expose both. Treat every ID in §3 as illustrative.
> - ⚠️ **`domain` IS A CLOSED ENUM ON THE EXISTING FLAT TABLE, NOT A NEW HIERARCHY.** It is not a
>   FK and it is not user-creatable, because it is the **comparability layer** — the thing that
>   lets one country's `cold_storage_loss` roll up beside another country's. Categories stay
>   user-creatable via `POST /research-categories`; that shipped capability is correct, because no
>   fixed list predicts every problem type. **Domain assignment is moderated separately from
>   category creation**: an unassigned category still pins and clusters immediately and simply does
>   not enter the country matrix until a moderator assigns it. Local specificity is immediate;
>   cross-country comparability is curated.
> - ⚠️ **SUBCATEGORIES ARE OPTIONAL, NOT TWO-OR-THREE PER DOMAIN.** Nesting, when it is needed, is
>   a nullable self-FK `parentCategoryId` — not a second fixed level.
> - **§4's "No 'Other' junk drawer" does not match the code**: `category_pin_icon_key` carries an
>   `other` label and it is the DEFAULT. That is pin ART, not a category, and the two should not be
>   conflated.
>
> Nothing here is built. `todo.md` §19 carries the migration.

## 1. Purpose & Principles

A stable, deterministic problem taxonomy is required to prevent spatial clustering from splintering and to ensure startup feasibility models evaluate comparable domain challenges.

### Core Rules

1. **Two-Level Hierarchy**:
    - **Domain Level (L1)**: Broad sectoral classification (e.g. `infrastructure`, `water_sanitation`, `energy_utilities`).
    - **Subcategory Level (L2)**: Specific, observable failure mode (e.g. `roads_bridges`, `drainage_flood`, `power_outages`).
2. **Immutable Slugs & UUIDs**: Slugs and category IDs are immutable once published. Display titles and descriptions may be updated without breaking existing cluster histories.
3. **No "Other" Junk Drawer**: Catch-all categories destroy clustering and feasibility scoring. If an unmet need does not fit the taxonomy, users propose a new category via `POST /research-categories` which enters a moderated evaluation workflow.

---

## 2. The Two-Level Taxonomy Structure

```
├── infrastructure (Built Environment & Civil Works)
│   ├── roads_bridges
│   ├── pedestrian_access
│   └── street_lighting
│
├── water_sanitation (Hydrology, Drainage & Waste Management)
│   ├── drainage_flood
│   ├── clean_water_access
│   └── solid_waste
│
├── energy_utilities (Electrical Power & Grid Infrastructure)
│   ├── power_outages
│   └── hazardous_wiring
│
├── agriculture_rural (Food Security, Cold Chain & Irrigation)
│   ├── cold_storage_loss
│   └── irrigation_deficit
│
└── transportation_mobility (Public Transit & Traffic Management)
    ├── signal_failure
    └── transit_desert
```

---

## 3. Detailed Taxonomy Corpus & Seed Data

### 3.1 Infrastructure (`infrastructure`)

_Domain Description: Physical civil works, road networks, pedestrian pathways, and public lighting._

#### 1. Roads & Bridges (`infrastructure/roads_bridges`)

- **ID**: `11000000-0000-0000-0000-000000000001`
- **Display Label**: Roads, Bridges & Pavement
- **Definition**: Potholes, asphalt erosion, pavement subsidence, missing manhole covers, bridge structural cracks, and road washouts.
- **Target Hardware / Startup Solutions**:
    - Cold-mix recycled polymer asphalt patching materials.
    - Mobile ultrasonic/computer-vision road surface inspection rigs.
    - High-durability composite manhole covers with anti-theft sensors.
- **Benchmark Link**: Corresponds to `thetraffic.in` category `pothole` ("Pothole or broken road").

#### 2. Pedestrian Access (`infrastructure/pedestrian_access`)

- **ID**: `11000000-0000-0000-0000-000000000002`
- **Display Label**: Pedestrian Footpaths & Crossings
- **Definition**: Missing sidewalks, pedestrian path obstruction, lack of safe zebra crossings, encroached footpaths, and inaccessible curbs.
- **Target Hardware / Startup Solutions**:
    - Modular precast permeable sidewalk pavers.
    - Solar-powered pedestrian crossing beacons with radar motion activation.
- **Benchmark Link**: Corresponds to `thetraffic.in` categories `footpath` ("Footpath missing or blocked") and `crossing` ("No safe way to cross").

#### 3. Street Lighting (`infrastructure/street_lighting`)

- **ID**: `11000000-0000-0000-0000-000000000003`
- **Display Label**: Street Lighting & Public Illumination
- **Definition**: Blown luminaires, unlit public alleys, broken poles, and intermittent public lighting.
- **Target Hardware / Startup Solutions**:
    - Off-grid solar LED luminaires with integrated LoRaWAN fault reporting.
    - Tamper-proof vandal-resistant street lamp ballasts.
- **Benchmark Link**: Corresponds to `thetraffic.in` category `light` ("Street light out").

---

### 3.2 Water & Sanitation (`water_sanitation`)

_Domain Description: Stormwater drainage, flood mitigation, potable water supply, and solid waste._

#### 1. Drainage & Flood Mitigation (`water_sanitation/drainage_flood`)

- **ID**: `12000000-0000-0000-0000-000000000001`
- **Display Label**: Drainage, Flooding & Standing Water
- **Definition**: Stormwater channel clogging, seasonal monsoon water logging, sewer backflow, and pooling water on thoroughfares.
- **Target Hardware / Startup Solutions**:
    - Submersible ultrasonic water level sensors for early flash flood warnings.
    - Autonomous or teleoperated trash-clearing stormwater grates.
- **Benchmark Link**: Corresponds to `thetraffic.in` category `water` ("Water logging or a leaking pipe").

#### 2. Clean Water Access (`water_sanitation/clean_water_access`)

- **ID**: `12000000-0000-0000-0000-000000000002`
- **Display Label**: Potable Water & Pipe Integrity
- **Definition**: Broken utility mains, arsenic/fluoride groundwater contamination, intermittent municipal tap supply, and unmonitored borehole quality.
- **Target Hardware / Startup Solutions**:
    - Low-cost electrochemical multiparameter water filtration and testing modules.
    - Acoustic leak-detection collar sensors for municipal water distribution.

#### 3. Solid Waste & Cleanliness (`water_sanitation/solid_waste`)

- **ID**: `12000000-0000-0000-0000-000000000003`
- **Display Label**: Solid Waste & Encroachment
- **Definition**: Illegal open-air dumping, overflowing dumpster stations, toxic burning of garbage, and public corridor encroachment.
- **Target Hardware / Startup Solutions**:
    - Smart solar-compacting public refuse bins with cellular fill-level alerts.
    - Localized pyrolytic waste-to-energy small-scale units.
- **Benchmark Link**: Corresponds to `thetraffic.in` category `parking` ("Parking or encroachment").

---

### 3.3 Energy & Utilities (`energy_utilities`)

_Domain Description: Electrical power transmission, grid reliability, and distribution safety._

#### 1. Power Outages & Grid Instability (`energy_utilities/power_outages`)

- **ID**: `13000000-0000-0000-0000-000000000001`
- **Display Label**: Power Outages & Voltage Instability
- **Definition**: Daily rolling blackouts, unpredictable brownouts, severe voltage surges destroying electronics, and lack of grid feeder access.
- **Target Hardware / Startup Solutions**:
    - Modular Lithium Iron Phosphate (LFP) smart battery backup inverters.
    - Automated phase-balancing surge protectors for commercial premises.

#### 2. Hazardous Wiring & Distribution (`energy_utilities/hazardous_wiring`)

- **ID**: `13000000-0000-0000-0000-000000000002`
- **Display Label**: Hazardous Electrical Infrastructure
- **Definition**: Sagging high-voltage wires, sparking transformers, exposed street-level distribution boxes, and ungrounded electrical poles.
- **Target Hardware / Startup Solutions**:
    - Low-cost thermal infrared monitoring sensors for distribution transformer poles.
    - Non-conductive structural enclosures for ground-level distribution boards.

---

### 3.4 Agriculture & Rural Systems (`agriculture_rural`)

_Domain Description: Post-harvest preservation, crop irrigation, and agricultural supply chain integrity._

#### 1. Cold Storage & Harvest Loss (`agriculture_rural/cold_storage_loss`)

- **ID**: `14000000-0000-0000-0000-000000000001`
- **Display Label**: Post-Harvest Cold Storage Deficit
- **Definition**: Fresh produce rotting in transit/storage due to lack of precooling, grid absence at collection centers, and unaffordable diesel refrigeration.
- **Target Hardware / Startup Solutions**:
    - Decentralized solar-powered thermal battery cold storage units.
    - Evaporative passive-cooling micro-sheds for horticulture farmers.

#### 2. Irrigation & Water Deficit (`agriculture_rural/irrigation_deficit`)

- **ID**: `14000000-0000-0000-0000-000000000002`
- **Display Label**: Agricultural Irrigation Deficit
- **Definition**: Canal breaches, collapsing borewells, overdrawn aquifer saline intrusion, and flood-irrigation water wastage.
- **Target Hardware / Startup Solutions**:
    - Solar brushless DC (BLDC) drip irrigation pumps with soil moisture telemetry.
    - Low-cost automated siphon valves for canal-fed farmlands.

---

### 3.5 Transportation & Mobility (`transportation_mobility`)

_Domain Description: Traffic control systems, public transit links, and roadway signals._

#### 1. Signal Failure & Control Outages (`transportation_mobility/signal_failure`)

- **ID**: `15000000-0000-0000-0000-000000000001`
- **Display Label**: Traffic Signals & Junction Controls
- **Definition**: Dark signal heads, flashing yellow default states, stuck red phases, uncoordinated junction green waves, and broken pedestrian pushbuttons.
- **Target Hardware / Startup Solutions**:
    - Low-cost solar backup UPS units specifically engineered for traffic signal controllers.
    - Edge-AI vehicle count & queue length camera sensors for adaptive signal green splits.
- **Benchmark Link**: Corresponds to `thetraffic.in` category `signal` ("Traffic signal problem").

#### 2. Transit Desert & Feeder Gaps (`transportation_mobility/transit_desert`)

- **ID**: `15000000-0000-0000-0000-000000000002`
- **Display Label**: Public Transit Deserts & Feeder Deficits
- **Definition**: Complete absence of scheduled public buses/trains, isolated industrial/worker suburbs, and hazardous illegal shuttle monopolies.
- **Target Hardware / Startup Solutions**:
    - Shared electric light-commercial vehicle (e-LCV) fleet kits and telematics.
    - Solar e-rickshaw charging hubs with unified smartcard/UPI ticketing validators.

---

## 4. Taxonomy Lifecycle & Evolution

1. **Version Tagging**: Every cluster and submission records `taxonomyVersion: "2026.1"`.
2. **Category Deprecation**:
    - A category is never deleted from the database if clusters reference it.
    - Deprecated categories transition to `status: "deprecated"`. They remain visible on historical clusters but cannot be selected for new submissions.
3. **Category Proposal Workflow**:
    - Authenticated users can propose new subcategories via `POST /research-categories`.
    - Newly proposed categories land in `pending` status and can be used immediately by the creator.
    - Platform moderators review pending categories:
        - **Approved**: Promoted to the global taxonomy and assigned an official UUID.
        - **Merged**: Pointed to an existing canonical slug via `mergedIntoCategoryId`.
        - **Rejected**: Archived with reason; submissions under it are reclassified.
